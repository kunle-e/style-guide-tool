var fs = require('fs'),
    fsPath = require('fs-path'),
    LineByLineReader = require('line-by-line'),
	gulp = require('gulp'),
	concat = require('gulp-concat'),
	ncp = require('ncp').ncp,
	rimraf = require('rimraf'),
	Entities = require('html-entities').XmlEntities;

	entities = new Entities();


lr = new LineByLineReader('structure.css');
  
  var done = {css:false,
			   js:false},
			 template='',
			 concatCSS = [],
			 concatJS = [],
			 menu = '',
			 menuItems = [],
			 currentParent, 
			 child, 
			 isParent, 
			 isChild = false, 
			 isContainer = false, 
			 containerName = '', 
			 ignoreLine = false,
			 isContainerEnd = false;
 
 
function concatFiles(arr, options){
console.log("inside of concatfiles");
	if(options.css){
		console.log('css true: ', arr, arr.length);
		
		gulp.task('css', function() {
			return gulp.src(arr)
			.pipe(concat('main.css'))
			.pipe(gulp.dest('./layout/src/css/'));
		});
		
		gulp.start('css');
		
	}else if(options.js){
		console.log('js true', arr, arr.length);
		gulp.task('js', function() {
			return gulp.src(arr)
			.pipe(concat('main.js'))
			.pipe(gulp.dest('./layout/src/js/'));
		});
		
	gulp.start('js');
		
	}
	
//decorate menu after css and js jobs	
 
		if(gulp.task('css') && gulp.task('js')){
			
			gulp.task('decorate-menu', ['css','js'], function() {
				console.log("after js css fired-running decorating menu");
				console.log('menu :',menu);
				
			 fs.readFile('./layout/layout.html', 'utf8', function (err,data) {
				  if (err) {
					return console.log(err);
				  }
				  var initialTemplate = data.replace(/{left-nav-menu-items}/, menu);

				  fs.writeFile('./layout/tmp.html', initialTemplate, 'utf8', function (err) {
					 if (err) {
						 return console.log(err);
					 }else {
						 
						 	 //build each component
						 fs.readFile('./layout/tmp.html', 'utf8', function (err,data){
							template = data;
	 
							 menuItems.forEach(function(i,x){
							//merge individual component html with template
				        
							   //check to see if menuitem contains path,if so, split it out from the component
							  	if(i.indexOf('/') > 0){
								   var lineParts = i.split('/');
								   containerPath = lineParts[0] + '/';
								   cmp = lineParts[1];
								}else {
									var cmp = i;
								}
							    
							 fs.readFile('./components/'+i+'/'+cmp+'.html', 'utf8', function (err,data){
								  if (err) {
									return console.log("ERRORS IN MENU DECORATION: ", err);
								  }
								  var tmp = [];
							 
						 
								  var result = data.split(/(<body>|<\/body>)/ig)[2];;
								  
								 
								  if(result){
									  var cmpBody = result;

									  
									  var result = template.replace(/{content}/, cmpBody);
									  
									  
									  //update active menu
									  result = result.replace('<li><a class="ctx-ksmi" href="' + i, '<li class="active"><a class="ctx-ksmi" href="' + i);
									  
									
									  //check if this component is a child, then update root path to be relative to this position
									  //in the structure. Also update the links for menus to reflect the directory structure for child pages
									  if(cmp != i){
										 result = result.replace(/{root}/g,'../');
										 
										 //update active container
										 //split container name from path. Update section html to active when we are on 
										 //components with this container in the path.
										 var container = i.split('/')[0];
										 var r = new RegExp('"ctx-ksmi-container" data-container="' + container,'g');
										 result = result.replace(r, '"ctx-ksmi-container active" data-container="' + container);
										 
										 //update url
										 result = result.replace(/class="ctx-ksmi" href="/g,'class="ctx-ksmi" href="../');
									  }else{
										result = result.replace(/{root}/g,''); 
									  }
									 
									 
									  
	                                  //console.log("Result------------", result);

									  //encode html entities. matching everything in code tags
									  result = result.replace(/<code(.*)>(.*[\s\S]*)<\/code>/gi, function(str, $1, $2) {
										 return '<code'+$1+'>'+entities.encode($2)+'</code>';
									  });


									  fsPath.writeFile('./www/'+i+'.html', result, 'utf8', function (err) {
										 if (err) {
											 return console.log("ERROR WRITING" ,err);
											 } 
										 }) 
								}
							  });
						});
						 
					 });//end tmp.html read file;
						 
					 } //end else
					 
				  });
				  
				  //copy tmp from layout to www
				  copyFile('./layout/tmp.html','./www/tmp.html', function(err){
					  if(!err){
						  
						  
					  }else{
						  
						  console.log("error copying file tmp");
					  }
					  
				  });

				 //rm src folder in www before copying

				 rimraf('./www/src',['rmdir'], function(err){
					 if(err){ console.log("error removing www/src");
					 } else{
						 console.log('removed ./www/src ok');
					 }



				 //copy /layout/src folder from   to www/src
				 ncp.limit = 16;
				 ncp.clobber=true;
				 ncp('./layout/src', './www/src', function (err) {
					 if (err) {
						 return console.error(err);
					 }
					 console.log('done!');
				 });

				 });

			});


			});
			gulp.start('decorate-menu');
		}


}//end concatfiles()
//end after handlers for css and js jobs

//build menu

 lr.on('line', function (line){
	isChild = false;
	isParent = true;
	ignoreLine = false;
	isContainerEnd = false;
	
	//if opening brackets are found, use the contents for the container name
	 if((/\[([A-z]*)\]/).test(line)){
		  containerName = line.match(/\[(.*)\]/)[1] + "/";  //make container name part of the path
		  isContainer = true;
	      isParent = false;
		  ignoreLine = true;
		  containerNameNoSlash = containerName.replace('/','');
		  
		  //start sub menu container markup
		  menu +='<li class="ctx-ksmi-container" data-container="' + containerNameNoSlash + '"><a href="#">' + containerNameNoSlash + '</a><ul>';
	 
	 }
	 
	   line = containerName  + line;  
	   
	  //this is the ending container. ignore operations on line if the line is a container
	 if((/\[\/.*\]/).test(line)){
		 console.log("____beggining container");
		 containerName = "";
		 isParent = true;
		 isContainer = false;
		 ignoreLine = true;
		 isContainerEnd = true;
     }
		 

	 if(!ignoreLine){
	console.log('printing line: ' + line);
	//take line and reference line.css, line.js
	//normalize container paths so as to not have line content duplicated 
	var cmp = '', containerPath ='';
	if(isContainer){
		console.log("______iNSIDE container");
		   var lineParts = line.split('/');
		   containerPath = lineParts[0] + '/';
		   cmp = lineParts[1];
	}else {
		
		containerPath = "";
		cmp = line;
	}
	  
	  
		concatCSS.push('./components/'  +  line + '/' + cmp +'.css');
		concatJS.push('./components/'   +  line + '/' + cmp +'.js');
		menuItems.push(line);

		menu += '<li><a class="ctx-ksmi" href="'+line+'.html">' + cmp + '</a></li>';
		
	 }
	 
	 //this is the ending container, end the sub menu markup
	 if(isContainerEnd){
		 console.log("____ENDING container");
	     menu +='</ul></li>';
	 }
 
});


lr.on('end', function () {
	// All lines are read, file is closed now.
	//start concatenating stuff
	console.log('line reading done, start concating');
	concatFiles(concatCSS, {css:true});
	concatFiles(concatJS, {js:true});

	
});



function copyFile(source, target, cb) {
  var cbCalled = false;

  var rd = fs.createReadStream(source);
  rd.on("error", function(err) {
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on("error", function(err) {
    done(err);
  });
  wr.on("close", function(ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (!cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }
}
