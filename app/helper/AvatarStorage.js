var _ = require("lodash");
var fs = require("fs");
var path = require("path");
var Jimp = require("Jimp");
var crypto = require("crypto");
var mkdirp = require("mkdirp");
var concat = require("concat-stream");
var streamifier = require("streamifier");
var avatarConfig = require("./app/config/avatar.config");

var UPLOAD_PATH = path.resolve(__dirname, '..', avatarConfig.AVATAR_STORAGE);

var AvatarStorage = function(options) {

    //Constructor
    function AvatarStorage(opts) {
        var baseUrl = avatarConfig.AVATAR_BASE_URL;

        var allowStorageSystems = ["local"];
        var allowOutputFormats = ["jpg", "png"];

        var defaultOptions = {
            storage: "local",
            output: "png",
            greyscale: false,
            quality: 70,
            square: true,
            threshold: 500,
            responsive: false
        };

        var options = (opts && _.isObject(opts)) ? _.pick(opts, _.keys(defaultOptions)) : {};
        options = _.extend(defaultOptions, options);

        this.options = _.forIn(options, function(value, key, object) {
            switch(key) {
                case "square": case "greyscale": case "responsive":
                    object[key] = _.isBoolean(value) ? value : defaultOptions[key];
                    break;

                case "storage":
                    value = String(value).toLowerCase();
                    object[key] = _.includes(allowStorageSystems, value) ? value : defaultOptions[key];
                    break;

                case "output":
                    value = String(value).toLowerCase();
                    object[key] = _.includes(allowOutputFormats, value) ? value : defaultOptions[key];
                    break;

                case "quality":
                    value = _.isFinite(value) ? value : Number(value);
                    object[key] = (value && value >= 0 && value <= 100) ? value : defaultOptions[key];
                    break;

                case "threshold":
                    value = _.isFinite(value) ? value : Number(value);
                    object[key] = (value && value >= 0) ? value : defaultOptions[key];
                    break;
            }
        });

        this.uploadPath = this.options.responsive ? path.join(UPLOAD_PATH, "responsive") : UPLOAD_PATH;

        this.uploadBaseUrl = this.options.responsive ? path.join(baseUrl, "responsive") : baseUrl;

        if(this.options.storage == "local") {
            !fs.existsSync(this.uploadPath) && mkdirp.sync(this.uploadPath);
        }
    }

    AvatarStorage.prototype._generateRandomFilename = function() {
        var bytes = crypto.pseudoRandomBytes(32);
        var checksum = crypto.createHash("MD5").update(bytes).digest("hex");

        return checksum + '.' + this.options.output;
    }

    AvatarStorage.prototype._createOutputStream = function(filepath, cb) {
        var that = this;
        var output = fs.createWriteStream(filepath);

        output.on("error", cb);

        output.on("finish", function() {
            cb(null, {
                destination: that.uploadPath,
                baseUrl: that.uploadBaseUrl,
                filename: path.basename(filepath),
                storage: that.options.storage
            });
        });

        return output;
    }

    AvatarStorage.prototype._proccessImage = function(image, cb) {
        var that = this;
        var batch = [];
        var sizes = ["lg", "md", "sm"];

        var filename = this._generateRandomFilename();

        var mime = Jimp.MIME_PNG;

        var clone = image.clone();

        var width = clone.bitmap.width;
        var height = clone.bitmap.height;
        var square = Math.min(width, height);
        var threshold = this.options.threshold;

        switch(this.options.output) {
            case "jpg":
                mime = Jimp.MIME_JPEG;
                break;
            case "png": default:
                mime = Jimp.MIME_PNG;
                break;
        }

        if(threshold && square > threshold) clone = (square == width) ? clone.resize(threshold, Jimp.AUTO) : clone.resize(Jimp.AUTO, threshold);

        if(threshold) square = Math.min(square, threshold);

        //Maybe error, using modulo
        clone = clone.crop((clone.bitmap.width % square) / 2, (clone.bitmap.height % square) / 2, square, square);

        if(this.options.greyscale) clone = clone.greyscale();

        clone = clone.quality(this.options.quality);

        if (this.options.responsive) {
            batch = _.map(sizes, function(size) {
                var outputStream;

                var image = null;
                var filepath = filename.split(".");

                filepath = filepath[0] + "_" + size + "." + filepath[1];
                filepath = path.join(that.uploadPath, filepath);
                outputStream = that._createOutputStream(filepath, cb);

                switch(size) {
                    case "sm":
                        image = clone.clone().scale(0.3);
                        break;

                    case "md":
                    image = clone.clone().scale(0.7);
                    break;

                    case "lg":
                    image = clone.clone();
                    break;
                }

                return {
                    stream: outputStream,
                    image: image
                };
            });
        } else {
            batch.push({
                stream: that._createOutputStream(path.join(that.uploadPath, filename), cb),
                image: clone
            });
        }

        _.each(batch, function(current) {
            current.image.getBuffer(mime, function(err, buffer) {
                if(that.options.storage == "local") streamifier.createReadStream(buffer).pipe(current.stream);
            });
        });
    }

    AvatarStorage.prototype._handleFile = function(req, file, cb) {
        var that = this;

        var fileManipulate = concat(function(imageData) {
            Jimp.read(imageData)
            .then(function(image) {
                that._proccessImage(image, cb);
            }).catch(b);
        });

        file.stream.pine(fileManipulate);
    };

    AvatarStorage.prototype._removeFile = function(req, file, cb) {
        var matches, pathsplit;
        var filename = file.filename;
        var _path = path.join(this.uploadPath, filename);
        var paths = [];

        delete file.filename;
        delete file.destination;
        delete file.baseUrl;
        delete file.storage;

        if(this.options.responsive) {
            pathsplit = _path.split("/");
            matches = pathsplit.pop().match(/^(.+?)_.+?\.(.+)$/i);

            if(matches) {
                paths = paths = _.map(["lg", "md", "sm"], function(size) {
                    return pathsplit.join('/') + '/' + (matches[1] + '_' + size + '.' + matches[2]);
                });
            } else {
                paths = [_path];
            }

            _.each(paths, function(_path) {
                fs.unlink(_path, cb);
            });
        };
    }

    return new AvatarStorage(options);
}

module.exports = AvatarStorage;