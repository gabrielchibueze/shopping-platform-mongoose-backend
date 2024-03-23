const fs = require("fs")

const deleteFile = (filePath)=>{
    return fs.unlink(filePath, (err)=>{
        if(err){
            return next(err)
        }
    })
}

exports.deleteFile = deleteFile;