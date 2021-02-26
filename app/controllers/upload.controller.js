const upload = require("../middlewares/upload");

const uploadFile = async (req, res) => {
    try {
        await upload(req, res);

        console.log(req.file);
        if(req.file == undefined) {
            return res.send("You must select a file");
        }

        return res.send("File uploaded");
    } catch(error) {
        console.log(error);
        return res.send("Error while trying to upload image");
    }
};

module.exports = {
    uploadFile: uploadFile
};