const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(
            null,
            path.join(
                __dirname,
                '../../uploads/profile_pictures'
            )
        );

    },

    filename: (req, file, cb) => {

        const userId = req.user.id;

        const extension =
            path.extname(file.originalname);

        const filename =
            `${userId}-${Date.now()}${extension}`;

        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {

    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                'Only JPG, PNG, and WEBP images are allowed.'
            )
        );
    }
};

const uploadProfilePicture = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

module.exports = uploadProfilePicture;