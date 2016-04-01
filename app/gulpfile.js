var gulp = require('gulp');
var watch = require('gulp-watch');
var batch = require('gulp-batch');


gulp.task('build', function() {

    console.log('Working!'); }

);

gulp.task('watch', function() {
    watch(['structure.css', 'components/**/*.{html,css,js}'], batch({limit: 1, timeout: 200},function(events, cb) {
        //gulp.start('build');
        console.log('new Working');
    }));
});