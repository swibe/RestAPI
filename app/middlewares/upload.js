const util = require('util');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const dbConfig = require("../config/db.config");

var storage = new GridFsStorage({
    url: `mongodb+srv://swibe:${dbConfig.PASSWORD}@${dbConfig.HOST}/${dbConfig.DB}?retryWrites=true&w=majority`,
    options: { useNewUrlParser: true, useUnifiedTopology: true },
    file: (req, file) => {
        const match = ["image/png", "image/jpeg"];

        if(match.indexOf(file.mimetype) === -1) {
            const filename = `${Date.now()}-swibe-${file.originalname}`;
            return filename;
        }

        return {
            bucketName: "profilePictures",
            filename: `${Date.now()}-swibe-${file.originalname}`
        }
    }
});

var uploadFile = multer({storage: storage}).single("file");
var uploadFilesMiddleware = util.promisify(uploadFile);
module.exports = uploadFilesMiddleware;