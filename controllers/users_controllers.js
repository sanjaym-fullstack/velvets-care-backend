const {
    Users,
    Otps,
    Files
} = require('../models')
const {
    Op
} = require('sequelize')
const {
    OTPFunctions, JWTFunctions, GoogleAuthFunctions
} = require('../helpers')
const fs = require('fs')

const { TwilioFunctions, FileFunctions } = require('../helpers')
const DEMO_OTP = '1234'

const normalizePhone = (phone) => {
    if (!phone) return phone;
    return phone.replace(/^(\+91|\+1|\+44|\+81|\+86|\+49|\+33|\+61|\+82|\+7|\+55|\+91)\s*/, '').trim();
};

const request_otp_login = async (req, res) => {
    try {

        const { phone: rawPhone } = req.payload;
        const phone = normalizePhone(rawPhone);
        const user = await Users.findOne({
            where: {
                phone: phone
            },
            raw: true
        })
        const otp = await OTPFunctions.getOTPByLength(4);
        console.log("login otp:", otp);
        if (!user) {
            return res.response({
                success: false,
                message: 'User not found, please register',
            });
            }
        const otpCode = await Otps.create({
            otp: otp,
            otp_time: Date.now()
        })
        // const sent = await TwilioFunctions.sendOtpViaTwilio(phone, otpCode.otp);
        // if (!sent) {
        //     throw new Error('OTP not sent');
        // }
        await Users.update({
            otp_id: otpCode.id
        }, {
            where: {
                id: user.id
            }
        })
        return res.response({
            success: true,
            otp: otpCode.otp,
            message: 'OTP sent successfully',
        })
    }
    catch (error) {
        console.log(error);
        return res.response({
            success: false,
            message: error.message,
        })

    }
}

const request_otp_register = async (req, res) => {
    try {
        const { phone: rawPhone, name } = req.payload;
        const phone = normalizePhone(rawPhone);
        const user = await Users.findOne({
            where: {
                phone: phone
            },
            raw: true
        })
        const otp = await OTPFunctions.getOTPByLength(4);
        console.log("register otp:", otp);
        if (user) {
           return res.response({
                success: false,
                message: 'User already exists',
            });
        }
        const otpCode = await Otps.create({
            otp: otp,
            otp_time: Date.now()
        })
        // const sent = await TwilioFunctions.sendOtpViaTwilio(phone, otpCode.otp);
        // if (!sent) {
        //     throw new Error('OTP not sent');
        // }
        await Users.create({
            phone: phone,
            name: name,
            otp_id: otpCode.id
        })
        return res.response({
            success: true,
            otp: otpCode.otp,
            message: 'OTP sent successfully',
        })
    }
    catch (error) {
        console.log(error);
        return res.response({
            success: false,
            message: error.message,
        })

    }
}
const verify_otp = async (req, res) => {
    try {
        const { phone: rawPhone, otp } = req.payload;
        const phone = normalizePhone(rawPhone);

        const user = await Users.findOne({ where: { phone }, raw: true });
        if (!user) {
            return res.response({
                success: false,
                message: 'User not found',
            });
        }

        // If DEMO_OTP is used
        if (otp == DEMO_OTP) {
            const payload = {
                user_id: user.id,
                phone: user.phone,
                name: user.name,
                role: 'USER'
            };
            const refresh_token = await JWTFunctions.generateToken(payload, '30d');
            const access_token = await JWTFunctions.generateToken(payload, '1d');

            await Users.update(
                { access_token, refresh_token },
                { where: { id: user.id } }
            );

            return res.response({
                success: true,
                message: 'OTP verified successfully (demo)',
                data: { access_token, refresh_token, user: payload },
            }).code(200);
        }

        // Real OTP verification
        const otpCode = await Otps.findOne({
            where: { id: user.otp_id },
            raw: true,
        });

        if (!otpCode) {
            return res.response({
                success: false,
                message: 'OTP not found',
            });
        }

        const otpTime = new Date(otpCode.otp_time);
        const currentTime = new Date();
        const diffInMinutes = (currentTime - otpTime) / 1000 / 60;

        if (diffInMinutes > 10) {
            return res.response({
                success: false,
                message: 'OTP expired',
            });
        }

        if (otpCode.otp !== otp) {
            return res.response({
                success: false,
                message: 'Invalid OTP',
            });
        }

        const payload = {
            user_id: user.id,
            phone: user.phone,
            name: user.name,
        };
        const refresh_token = await JWTFunctions.generateToken(payload, '30d');
        const access_token = await JWTFunctions.generateToken(payload, '1d');

        await Users.update(
            { access_token, refresh_token },
            { where: { id: user.id } }
        );

        await Otps.destroy({ where: { id: user.otp_id } });

        return res.response({
            success: true,
            message: 'OTP verified successfully',
            data: { access_token, refresh_token, user: payload },
        }).code(200);

    } catch (error) {
        console.error(error);
        return res.response({
            success: false,
            message: error.message,
        }).code(200);
    }
};


const validateusersession = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) {
            return res.response({
                success: false,
                message: 'Session expired',
            }).code(200);
        }
        console.log(session_user, "session checker");
        const user = await Users.findOne({
            where: { id: session_user.user_id, access_token: req.headers['authorization'] },
            raw: true,
            attributes: ['id', 'name', 'phone'],
        },
        )
        if (!user) {
            return res.response({
                success: false,
                message: 'Session expired',
            }).code(200);
        }
        return res.response({
            success: true,
            message: 'Session validated',
            data: user,
        }).code(200);
    } catch (error) {
        console.log(error);
        return res.response({
            success: false,
            message: error.message,
        }).code(200);
    }
}

const logout = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) {
            return res.response({
                success: false,
                message: 'Session expired',
            }).code(200);
        }
        const { refresh_token } = req.payload;
        if (!refresh_token) {
            return res.response({
                success: false,
                message: 'Refresh token required',
            }).code(200);
        }
        const decoded = JWTFunctions.verifyToken(refresh_token);
        const user = await Users.findOne({ where: { id: decoded.user_id } });
        if (!user) {
            return res.response({
                success: false,
                message: 'User not found',
            }).code(200);
        }

        await Users.update({
            access_token: null,
            refresh_token: null,
        }, {
            where: {
                id: session_user.user_id
            }
        })
        return res.response({
            success: true,
            message: 'Logout successful',
        }).code(200);

    } catch (error) {
        console.log(error);
        return res.response({
            success: false,
            message: error.message,
        }).code(200);
    }
}

const update_user = async (req, res) => {
  try {
    const session_user = req.headers.user;
    if (!session_user) {
      return res.response({
        success: false,
        message: 'Session expired',
      }).code(200);
    }

    const { name, phone: rawPhone, gender, profile_image, dob, email } = req.payload;
    const phone = normalizePhone(rawPhone);

    const user = await Users.findOne({ where: { id: session_user.user_id } });
    if (!user) {
      return res.response({
        success: false,
        message: 'User not found',
      }).code(200);
    }

    let profileFileId = user.profile_image_id;

    if (profile_image) {
      // Upload to S3
      const uploadedFile = await FileFunctions.uploadToS3(
        profile_image.filename,
        'uploads/profiles',
        fs.readFileSync(profile_image.path)
      );

      // Save file record in DB
      const fileRecord = await Files.create({
        files_url: uploadedFile.key,
        extension: uploadedFile.key.split('.').pop(),
        original_name: uploadedFile.key,
        size: fs.statSync(profile_image.path).size
      });

      profileFileId = fileRecord.id;
    }

    // Update user record
    await Users.update({
      name,
      phone,
      gender,
      dob,
      email,
      profile_image_id: profileFileId
    }, { where: { id: session_user.user_id } });

    // Fetch updated user with profile image
    const updatedUser = await Users.findOne({
      where: { id: session_user.user_id },
      include: [{
        model: Files,
        required: false
      }],
      raw: true,
      nest: true,
      mapToModel: true
    });

    // Map S3 URL
    const user_data = {
      ...updatedUser,
      profile_image: updatedUser.profile_image?.files_url
        ? await FileFunctions.getFromS3(updatedUser.profile_image.files_url)
        : null
    };

    return res.response({
      success: true,
      message: 'User updated successfully',
      data: user_data
    }).code(200);

  } catch (error) {
    console.log(error);
    return res.response({
      success: false,
      message: error.message
    }).code(500);
  }
};

const user_refresh_token = async (req, res) => {
    try {
        const { refresh_token } = req.headers;
        if (!refresh_token) {
            return res.response({
                success: false,
                message: 'Refresh token required',
            }).code(200);
        }
        const decoded = JWTFunctions.verifyToken(refresh_token);
        const user = await Users.findOne({ where: { id: decoded.user_id } });
        if (!user) {
            return res.response({
                success: false,
                message: 'User not found',
            }).code(200);
        }
        const payload = {
            user_id: user.id,
            phone: user.phone,
            name: user.name
        }
        const access_token = await JWTFunctions.generateToken(payload, '1d');
        const new_refresh_token = await JWTFunctions.generateToken(payload, '30d');
        await Users.update({
            access_token: access_token,
            refresh_token: new_refresh_token
        }, {
            where: {
                id: decoded.user_id
            }
        }
        )
        return res.response({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                access_token: access_token,
                refresh_token: new_refresh_token,
                user: payload
            }
        }).code(200);
    } catch (error) {
        console.log(error);
        return res.response({
            success: false,
            message: error.message,
        }).code(200);
    }
}

const getusers = async (req, res) => {
  try {
    const session_user = req.headers.user;
    if (!session_user) {
      return res.response({
        success: false,
        message: 'Session expired',
      }).code(200);
    }

    const { page = 1, limit = 10, searchquery } = req.query;

    let filter = {};
    if (searchquery) {
      filter = {
        [Op.or]: [
          { name: { [Op.like]: `%${searchquery}%` } },
          { phone: { [Op.like]: `%${searchquery}%` } },
        ],
      };
    }

    const user_count = await Users.count({ where: filter });

    const users = await Users.findAll({
      where: filter,
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      include: [{
        model: Files,
        required: false
      }],
      raw: true,
      nest: true,
        mapToModel: true
    });

    // Map S3 URLs for profile images
    const users_mapped = await Promise.all(users.map(async (user) => ({
      ...user,
      profile_image: user.profile_image?.files_url
        ? await FileFunctions.getFromS3(user.profile_image.files_url)
        : null
    })));

    return res.response({
      success: true,
      message: 'Users fetched successfully',
      data: users_mapped,
      total: user_count,
      page: parseInt(page),
      limit: parseInt(limit)
    }).code(200);

  } catch (error) {
    console.error(error);
    return res.response({
      success: false,
      message: error.message,
    }).code(500);
  }
};

const googleSignIn = async (request, h) => {
    try {
        const { token } = request.payload;
        const userData = await GoogleAuthFunctions.verifyGoogleToken(token);

        let user = await Users.findOne({ where: { email: userData.email } });

        let accessToken, refreshToken;
        const payload = {
            user_id: user?.id,
            email: userData.email,
            name: userData.name,
            role: 'USER'
        };

        if (!user) {
            accessToken = await JWTFunctions.generateToken(payload, '1d');
            refreshToken = await JWTFunctions.generateToken(payload, '30d');

            user = await Users.create({
                email: userData.email,
                name: userData.name,
                access_token: accessToken,
                refresh_token: refreshToken,
            });

            payload.user_id = user.id;

            await Users.update({
                access_token: accessToken,
                refresh_token: refreshToken
            }, {
                where: { id: user.id }
            });
        } else {
            payload.user_id = user.id;
            accessToken = await JWTFunctions.generateToken(payload, '1d');
            refreshToken = await JWTFunctions.generateToken(payload, '30d');

            await Users.update({
                access_token: accessToken,
                refresh_token: refreshToken
            }, {
                where: { id: user.id }
            });
        }
        return h.response({
            success: true,
            message: 'Login successful',
            data: {
                access_token: accessToken,
                refresh_token: refreshToken,
                user: payload,
            }
        }).code(200);

    } catch (err) {
        console.error(err);
        return h.response({
            success: false,
            message: err.message
        }).code(401);
    }
};

const getuserData = async (request, h) => {
    try {
        const session_user = request.headers.user;
        if (!session_user) {
            return h.response({
                success: false,
                message: 'Session expired',
            }).code(200);
        }
        const user = await Users.findOne({
            where: { id: session_user.user_id },
            attributes: ['id', 'name', 'phone', 'email', 'dob', 'profile_image_id'],
            include: [{
                model: Files,            }],
            raw: true,
            nest: true,
            mapToModel: true
        });
        if (!user) {
            return h.response({
                success: false,
                message: 'User not found',
            }).code(200);
        }
        return h.response({
            success: true,
            message: 'User data fetched successfully',
            data: {
                ...user,
                profile_image: user.file?.files_url ? await FileFunctions.getFromS3(user.file.files_url) : null
            }
        }).code(200);
    } catch (error) {
        console.error(error);
        return h.response({
            success: false,
            message: error.message
        }).code(500);
    }
};

const CreateUserByAdmin = async (req, res) => {
  try {
    const session_user = req.headers.user;
    if (!session_user) {
      return res.response({
        success: false,
        message: 'Session expired',
      }).code(200);
    }

    const { name, phone: rawPhone, gender, profile_image, dob } = req.payload;
    const phone = normalizePhone(rawPhone);

    const existing_user = await Users.findOne({ where: { phone } });
    if (existing_user) {
      return res.response({
        success: false,
        message: 'User already exists',
      }).code(200);
    }

    let profileFileId = null;

    if (profile_image) {
      // Upload profile image to S3
      const uploadedFile = await FileFunctions.uploadToS3(
        profile_image.filename,
        'uploads/profiles',
        fs.readFileSync(profile_image.path)
      );

      // Save file record in DB
      const fileRecord = await Files.create({
        files_url: uploadedFile.key,
        extension: uploadedFile.key.split('.').pop(),
        original_name: uploadedFile.key,
        size: fs.statSync(profile_image.path).size
      });

      profileFileId = fileRecord.id;
    }

    // Create user
    const user = await Users.create({
      name,
      phone,
      gender,
      dob,
      profile_image_id: profileFileId
    });

    // Map profile image to S3 URL
    const userData = {
      ...user.get({ plain: true }),
      profile_image: profileFileId
        ? await FileFunctions.getFromS3((await Files.findByPk(profileFileId)).file_url)
        : null
    };

    return res.response({
      success: true,
      message: 'User created successfully',
      data: userData
    }).code(201);

  } catch (error) {
    console.error(error);
    return res.response({
      success: false,
      message: error.message
    }).code(500);
  }
};


module.exports = {
    request_otp_login,
    request_otp_register,
    verify_otp,
    validateusersession,
    logout,
    update_user,
    user_refresh_token,
    getusers,
    googleSignIn,
    getuserData,
    CreateUserByAdmin



}