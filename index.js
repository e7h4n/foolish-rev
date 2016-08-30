#!/usr/bin/env node
'use strict';

var gulp = require('gulp');
var merge = require('merge-stream');
var rev = require('gulp-rev');
var revCssUrl = require('gulp-rev-css-url');
var revCollector = require('gulp-rev-collector');
var tap = require('gulp-tap');
var debug = require('debug');
var del = require('del');
var vinylPaths = require('vinyl-paths');

var tapDebug = function (name, showContent) {
    var logger = debug(name);
    return tap(function (file) {
        if (showContent) {
            logger(file.path, file.contents.toString().substr(0, 1024));
        } else {
            logger(file.path);
        }
    });
};


gulp.task('build', function () {
    var allFiles = gulp.src(['dist/**/*.*', '!dist/index.html'])
        .pipe(tapDebug('src'))
        .pipe(rev())
        .pipe(tapDebug('rev'))
        .pipe(revCssUrl())
        .pipe(gulp.dest('./dist/'))
        .pipe(tapDebug('dist'))
        .pipe(tap(function (file) {
            del(file.revOrigPath);
            return file;
        }));

    // 修改引用信息，增加 URL 前缀
    var revManifest = allFiles.pipe(rev.manifest());

    // 通过 manifest 中配置的文件信息，对 html 中的引用进行替换
    merge(revManifest, gulp.src('dist/index.html'))
        .pipe(tapDebug('revManifest', true))
        .pipe(revCollector()) // 引用替换
        .pipe(gulp.dest('./dist/'));
});

gulp.start('build');
