#!/usr/bin/env node
'use strict';

const gulp = require('gulp');
const merge = require('merge-stream');
const rev = require('gulp-rev');
const revCollector = require('gulp-rev-collector');
const tap = require('gulp-tap');
const debug = require('debug');
const del = require('del');
const through2 = require('through2');
const rework = require('gulp-rework');
const cssUrl = require('rework-plugin-url');
const path = require('path');
const Url = require('url');
const Vinyl = require('vinyl');

const tapDebug = function (name, showContent) {
    const logger = debug(name);
    return tap(function (file) {
        if (showContent) {
            logger(file.path, file.contents.toString().substr(0, 1024));
        } else {
            logger(file.path);
        }
    });
};

function relPath(base, filePath) {
	if (filePath.indexOf(base) !== 0) {
		return filePath.replace(/\\/g, '/');
	}

	const newPath = filePath.substr(base.length).replace(/\\/g, '/');

	if (newPath[0] === '/') {
		return newPath.substr(1);
	}

	return newPath;
}


gulp.task('build', function () {
    const manifest = {};
    const revManifest = gulp.src(['dist/**/*.*', '!dist/index.html'])
        .pipe(tapDebug('src'))
        .pipe(rev())
        .pipe(through2.obj(function (file, enc, callback) {
            this.push(file);

            const revisionedFile = relPath(file.base, file.path);
            const originalFile = path.join(path.dirname(revisionedFile), path.basename(file.revOrigPath)).replace(/\\/g, '/');
            manifest[originalFile] = revisionedFile;

            callback();
        }))
        .pipe(tapDebug('rev'))
        .pipe(gulp.dest('./dist/'))
        .pipe(tapDebug('dist'))
        .pipe(tap(function (file) {
            del(file.revOrigPath);
            return file;
        }))
        .pipe(rev.manifest())
        .pipe(tapDebug('revManifest', true));

    revManifest.pipe(tap(function () {
        gulp.src('dist/**/*.css')
            .pipe(rework(cssUrl(function (content, d) {
                if (content.indexOf('http') === 0 || content.indexOf('data:') >= 0) {
                    return content;
                }

                let cssFile = new Vinyl({
                    base: 'dist/',
                    path: this.position.source
                });
                let dirname = cssFile.dirname;

                let suffix = '';
                content = content.replace(/[#\?].*/, ($0) => {
                    suffix = $0;
                    return '';
                });

                let resourceFile = new Vinyl({
                    base: 'dist/',
                    path: path.resolve(dirname, content)
                });

                let revFilePath = manifest[resourceFile.relative];
                if (!revFilePath) {
                    throw new Error('invalid file path: ' + resourceFile.relative);
                }

                let revFile = new Vinyl({
                    base: dirname,
                    path: path.resolve(process.cwd(), 'dist/', revFilePath)
                });

                return revFile.relative + suffix;
            })))
            .pipe(gulp.dest('dist/'));
    }));

    // 通过 manifest 中配置的文件信息，对 html 中的引用进行替换
    merge(revManifest, gulp.src('dist/index.html'))
        .pipe(revCollector()) // 引用替换
        .pipe(gulp.dest('./dist/'));
});

gulp.start('build');
