const {
    Doctors,
    Doctorsavailability,
    Adresses,
    Otps,
    Files,
    Appointments,
    Specialization
} = require('../models')
const {
    Op,
    fn,
    col,
    where
} = require('sequelize')
const {
    OTPFunctions, JWTFunctions
} = require('../helpers')
const fs = require('fs')

const { TwilioFunctions, FileFunctions } = require('../helpers');
const { ComplianceInquiriesContextImpl } = require('twilio/lib/rest/trusthub/v1/complianceInquiries');
const { default: ClientCapability } = require('twilio/lib/jwt/ClientCapability');
const { off } = require('../config/mailer');

const updateBasicDetails = async (req, h) => {
    try {
         const transaction = await sequelize.transaction();
        const session_user = req.headers.user;
        if (!session_user) {
            throw new Error('Session expired');
        }
        const {
            full_name, gender, date_of_birth, phone, email,
            specialization, years_of_experience, registration_number,
            registration_certificate, medical_degree_certificate,
            consultation_fee, consultation_modes, languages_spoken, profile_image, government_id, pan_card
        } = req.payload;
        console.log(req.payload, "payload");
        const existing_doctor = await Doctors.findOne({
            where: {
                [Op.or]: [
                    { phone: phone },
                    { email: email }
                ]
            }
        })

        if (existing_doctor) {
            throw new Error('Doctor already exists');
        }
        // File Uploads
        let regCertFileId = null;
        let degreeCertFileId = null;
        let govFileId = null;
        let profileFileId = null;
        let panFileId = null;

        if (profile_image) {
            const uploadedfile = await FileFunctions.uploadToS3(profile_image.filename,  'uploads/profile_images', fs.readFileSync(profile_image.path));
            const profileFile = await Files.create({
                file_url: uploadedfile.key,
                extension: uploadedfile.key.split('.').pop(),
                original_name: uploadedfile.key,
                size: fs.statSync(profile_image.path).size
            }, { transaction });
            profileFileId = profileFile.id;
        }

        if (government_id) {
            const uploadedfile = await FileFunctions.uploadToS3(government_id.filename,  'uploads/government_ids', fs.readFileSync(government_id.path));
            const govFile = await Files.create({
                file_url: uploadedfile.key,
                extension: uploadedfile.key.split('.').pop(),
                original_name: uploadedfile.key,
                size: fs.statSync(government_id.path).size
            }, { transaction });
            govFileId = govFile.id;
        }

        if (pan_card) {
            const uploadedfile = await FileFunctions.uploadToS3(pan_card.filename,  'uploads/pan_cards', fs.readFileSync(pan_card.path));
            const panFile = await Files.create({
                file_url: uploadedfile.key,
                extension: uploadedfile.key.split('.').pop(),
                original_name: uploadedfile.key,
                size: fs.statSync(pan_card.path).size
            }, { transaction });
            panFileId = panFile.id;
        }

        if (registration_certificate) {
            const uploadedfile = await FileFunctions.uploadToS3(registration_certificate.filename,  'uploads/registration_certificates', fs.readFileSync(registration_certificate.path));
            const regFile = await Files.create({
                file_url: uploadedfile.key,
                extension: uploadedfile.key.split('.').pop(),
                original_name: uploadedfile.key,
                size: fs.statSync(registration_certificate.path).size
            }, { transaction });
            regCertFileId = regFile.id;
        }

        if (medical_degree_certificate) {
            const uploadedfile = await FileFunctions.uploadToS3(medical_degree_certificate.filename,  'uploads/medical_degree_certificates', fs.readFileSync(medical_degree_certificate.path));
            const degreeFile = await Files.create({
                file_url: uploadedfile.key,
                extension: uploadedfile.key.split('.').pop(),
                original_name: uploadedfile.key,
                size: fs.statSync(medical_degree_certificate.path).size
            }, { transaction });
            degreeCertFileId = degreeFile.id;
        }

        const doctor = await Doctors.create({
            full_name,
            gender,
            date_of_birth,
            phone,
            email,
            specialization,
            years_of_experience,
            registration_number,
            registration_certificate_id: regCertFileId,
            medical_degree_certificate_id: degreeCertFileId,
            consultation_fee,
            consultation_modes: JSON.stringify(consultation_modes),
            languages_spoken: JSON.stringify(languages_spoken),
            profile_image_id: profileFileId,
            government_id: govFileId,
            pan_card_id: panFileId
        });
        await transaction.commit();
        return h.response({
            success: true,
            message: 'Basic details updated successfully',
            data: doctor
        }).code(201);
        
    } catch (err) {
        await transaction.rollback();
        console.error(err);
        return h.response({ success: false, message: 'Error updating basic details' }).code(500);
    }
};


const updateAddress = async (req, h) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) {
            throw new Error('Session expired');
        }
        const {
            street, area, city, state, country, zip,
            landmark, latitude, longitude, doctor_id
        } = req.payload;

        const doctor = await Doctors.findOne({
            where: { id: doctor_id }
        });
        if (!doctor) {
            throw new Error('Doctor not found');
        }

        const available_address = await Adresses.findOne({
            where: {
                doctor_id: doctor_id
            }
        })

        if (available_address) {
            await available_address.update({
                street: street,
                area: area,
                city: city,
                state: state,
                country: country,
                zip: zip,
                landmark: landmark,
                latitude: latitude,
                longitude: longitude
            },
                {
                    where: {
                        id: available_address.id
                    }
                });
        }
        else {
            const address = await Adresses.create({
                street: street,
                area: area,
                city: city,
                state: state,
                country: country,
                zip: zip,
                landmark: landmark,
                latitude: latitude,
                longitude: longitude,
                doctor_id: doctor_id
            });
        }
        // await Doctor.update({ address_id: address.id }, { where: { id: doctor_id } });
        return h.response({
            success: true,
            message: 'Address updated successfully',
            data: address
        }).code(201);
    } catch (err) {
        console.error(err);
        return h.response({
            success: false,
            message: 'Error saving address'
        }).code(200);
    }
};



const updateAvailability = async (req, h) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) {
            throw new Error('Session expired');
        }

        const { doctor_id, availability } = req.payload;

        const doctor = await Doctors.findOne({ where: { id: doctor_id } });
        if (!doctor) {
            throw new Error('Doctor not found');
        }

        for (const slot of availability) {
            const existingSlot = await Doctorsavailability.findOne({
                where: {
                    doctor_id,
                    day: slot.day,
                    start_time: slot.start_time,
                    end_time: slot.end_time
                }
            });

            if (existingSlot) {
                // Update slot if needed
                await existingSlot.update({
                    ...slot
                },
                    {
                        where: {
                            id: existingSlot.id
                        }
                    });
            } else {
                // Create new slot
                await Doctorsavailability.create({
                    doctor_id,
                    day: slot.day,
                    start_time: slot.start_time,
                    end_time: slot.end_time
                });
            }
        }

        return h.response({
            success: true,
            message: 'Availability updated successfully',
            data: availability
        }).code(200);

    } catch (err) {
        console.error(err);
        return h.response({
            success: false,
            message: err.message || 'Error updating availability'
        }).code(500);
    }
};


const updateStatus = async (req, h) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) {
            throw new Error('Session expired');
        }
        const { doctor_id, status, verified } = req.payload;

        await Doctors.update({
            status: status,
            verified: verified
        },
            {
                where: {
                    id: doctor_id
                }
            });

        return h.response({
            success: true,
            message: 'Status updated'

        }).code(200);
    } catch (err) {
        console.error(err);
        return h.response({
            success: false,
            message: 'Error updating status'
        }).code(200);
    }
};
const doctorlist_user = async (req, h) => {
  try {
    const session_user = req.headers.user;
    if (!session_user) throw new Error('Session expired');

    const { specialization, years_of_experience, searchquery, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let filter = { verified: true };

    if (searchquery) {
      filter[Op.or] = [
        { full_name: { [Op.like]: `%${searchquery}%` } },
        { phone: { [Op.like]: `%${searchquery}%` } }
      ];
    }
    if (specialization) filter.specialization = specialization;
    if (years_of_experience) filter.years_of_experience = Number(years_of_experience);

    const total = await Doctors.count({ where: filter });

    const rows = await Doctors.findAll({
      where: filter,
      limit: Number(limit),
      offset,
      include: [
        { model: Files, as: 'profile_image', required: false },
        { model: Adresses },
        { model: Doctorsavailability },
        { model: Specialization }
      ],
      raw: true,
      nest: true,
      order: [['createdAt', 'DESC']]
    });

    // Map doctors by ID (handle multiple availabilities)
    const doctorMap = {};

    for (const row of rows) {
      const doctorId = row.id;

      if (!doctorMap[doctorId]) {
        doctorMap[doctorId] = { ...row };

        // Banner-style async fetch for profile image only
        doctorMap[doctorId].profile_image = row.profile_image?.files_url
          ? await FileFunctions.getFromS3(row.profile_image.files_url)
          : null;

        doctorMap[doctorId].doctorsavailabilities = [];
      }

      // Push multiple availabilities
      if (row.doctorsavailabilities?.id) {
        doctorMap[doctorId].doctorsavailabilities.push(row.doctorsavailabilities);
      }
    }

    return h.response({
      success: true,
      message: 'Doctor list fetched successfully',
      data: Object.values(doctorMap),
      total,
      page: Number(page),
      limit: Number(limit)
    }).code(200);

  } catch (error) {
    console.error('Doctor list user error:', error);
    return h.response({
      success: false,
      message: error.message
    }).code(500);
  }
};



const doctorlist = async (req, h) => {
  try {
    const session_user = req.headers.user;
    if (!session_user) throw new Error('Session expired');

    const { specialization, years_of_experience, searchquery, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let filter = {};

    if (searchquery) {
      filter[Op.or] = [
        { full_name: { [Op.like]: `%${searchquery}%` } },
        { phone: { [Op.like]: `%${searchquery}%` } }
      ];
    }

    if (specialization) filter.specialization = specialization;
    if (years_of_experience) filter.years_of_experience = Number(years_of_experience);

    const total = await Doctors.count({ where: filter });

    const doctors = await Doctors.findAll({
      where: filter,
      limit: Number(limit),
      offset,
      include: [
        { model: Adresses },                 // ✅ now returns array
        { model: Doctorsavailability },      // ✅ now returns array

        { model: Files, as: 'profile_image', required: false },
        { model: Files, as: 'registration_certificate', required: false },
        { model: Files, as: 'medical_degree_certificate', required: false },
        { model: Files, as: 'government_id_file', required: false },
        { model: Files, as: 'pan_card_file', required: false },
        { model: Specialization },
      ],
      order: [['createdAt', 'DESC']]
    });

    // Process images like banner
    const mapped_doctors = await Promise.all(
      doctors.map(async (doc) => {
        const json = doc.toJSON();

        return {
          ...json,

          profile_image: json.profile_image?.files_url
            ? await FileFunctions.getFromS3(json.profile_image.files_url)
            : null,

          registration_certificate: json.registration_certificate?.files_url
            ? await FileFunctions.getFromS3(json.registration_certificate.files_url)
            : null,

          medical_degree_certificate: json.medical_degree_certificate?.files_url
            ? await FileFunctions.getFromS3(json.medical_degree_certificate.files_url)
            : null,

          government_id: json.government_id_file?.files_url
            ? await FileFunctions.getFromS3(json.government_id_file.files_url)
            : null,

          pan_card: json.pan_card_file?.files_url
            ? await FileFunctions.getFromS3(json.pan_card_file.files_url)
            : null
        };
      })
    );

    return h.response({
      success: true,
      message: 'Doctors fetched successfully',
      data: mapped_doctors,
      total,
      page: Number(page),
      limit: Number(limit)
    }).code(200);

  } catch (err) {
    console.error('Doctor list error:', err);
    return h.response({
      success: false,
      message: err.message
    }).code(500);
  }
};



const fetch_single_doctor = async (req, h) => {
  try {
    const session_user = req.headers.user;
    if (!session_user) throw new Error('Session expired');

    const { doctor_id } = req.params;

    const doctor = await Doctors.findOne({
      where: { id: doctor_id },
      include: [
        { model: Adresses },
        { model: Doctorsavailability },
        { model: Files, as: 'profile_image', required: false },
        { model: Files, as: 'registration_certificate', required: false },
        { model: Files, as: 'medical_degree_certificate', required: false },
        { model: Files, as: 'government_id_file', required: false },
        { model: Files, as: 'pan_card_file', required: false },
        { model: Specialization }
      ],
      raw: true,
      nest: true
    });

    if (!doctor) {
      return h.response({ success: false, message: 'Doctor not found' }).code(404);
    }

    // Wrap the doctor object in an array to use banner-style Promise mapping
    const doctor_mapped = await Promise.all(
      [doctor].map(async (d) => ({
        ...d,
        profile_image: d.profile_image?.files_url
          ? await FileFunctions.getFromS3(d.profile_image.files_url)
          : null,
        registration_certificate: d.registration_certificate?.files_url
          ? await FileFunctions.getFromS3(d.registration_certificate.files_url)
          : null,
        medical_degree_certificate: d.medical_degree_certificate?.files_url
          ? await FileFunctions.getFromS3(d.medical_degree_certificate.files_url)
          : null,
        government_id: d.government_id_file?.files_url
          ? await FileFunctions.getFromS3(d.government_id_file.files_url)
          : null,
        pan_card: d.pan_card_file?.files_url
          ? await FileFunctions.getFromS3(d.pan_card_file.files_url)
          : null
      }))
    );

    return h.response({
      success: true,
      message: 'Doctor fetched successfully',
      data: doctor_mapped[0]  // return single doctor object
    }).code(200);

  } catch (err) {
    console.error('Fetch single doctor error:', err);
    return h.response({ success: false, message: err.message }).code(500);
  }
};


const fetch_popular_doctors = async (req, h) => {
  try {
    const session_user = req.headers.user;
    if (!session_user) throw new Error("Session expired");

    const popularDoctors = await Appointments.findAll({
      where: { status: "completed" },
      attributes: [
        "doctor_id",
        [fn("COUNT", col("doctor_id")), "completed_count"]
      ],
      group: ["doctor_id"],
      order: [[fn("COUNT", col("doctor_id")), "DESC"]],
      limit: 10,
      raw: true,
    });

    if (!popularDoctors.length) {
      return h.response({
        success: true,
        message: "No popular doctors found",
        data: [],
      });
    }

    const doctorIds = popularDoctors.map((d) => d.doctor_id);

    const doctors = await Doctors.findAll({
      where: { id: { [Op.in]: doctorIds } },
      include: [
        { model: Files, as: "profile_image", required: false },
        { model: Files, as: "registration_certificate", required: false },
        { model: Files, as: "medical_degree_certificate", required: false },
        { model: Files, as: "government_id_file", required: false },
        { model: Files, as: "pan_card_file", required: false },
        { model: Adresses },
        { model: Doctorsavailability },
        { model: Specialization }
      ],
      distinct: true,  // 🔥 avoids duplicates caused by joins
      nest: true,
    });

    // Convert to map for quick lookup
    const doctorsMap = {};
    for (let d of doctors) {
      doctorsMap[d.id] = d;
    }

    // Preserve sorted order based on completed count
    const finalList = await Promise.all(
      popularDoctors.map(async (pop) => {
        const doc = doctorsMap[pop.doctor_id];
        if (!doc) return null;

        return {
          ...doc.toJSON(),

          completed_appointments: pop.completed_count,

          profile_image: doc.profile_image?.files_url
            ? await FileFunctions.getFromS3(doc.profile_image.files_url)
            : null,

          registration_certificate: doc.registration_certificate?.files_url
            ? await FileFunctions.getFromS3(doc.registration_certificate.files_url)
            : null,

          medical_degree_certificate: doc.medical_degree_certificate?.files_url
            ? await FileFunctions.getFromS3(doc.medical_degree_certificate.files_url)
            : null,

          government_id: doc.government_id_file?.files_url
            ? await FileFunctions.getFromS3(doc.government_id_file.files_url)
            : null,

          pan_card: doc.pan_card_file?.files_url
            ? await FileFunctions.getFromS3(doc.pan_card_file.files_url)
            : null,
        };
      })
    );

    return h.response({
      success: true,
      message: "Popular doctors fetched successfully",
      data: finalList.filter(Boolean), // remove nulls
    });

  } catch (err) {
    console.error(err);
    return h.response({ success: false, message: err.message }).code(400);
  }
};


const fetch_popular_doctors_admin = async (req, h) => {
  try {
    const session_user = req.headers.user;
    if (!session_user) throw new Error("Session expired");

    // STEP 1: Get popular doctors sorted
    const popularDoctors = await Appointments.findAll({
      where: { status: "completed" },
      attributes: [
        "doctor_id",
        [fn("COUNT", col("doctor_id")), "completed_count"]
      ],
      group: ["doctor_id"],
      order: [[fn("COUNT", col("doctor_id")), "DESC"]],
      raw: true,
    });

    if (!popularDoctors.length) {
      return h
        .response({
          success: true,
          message: "No popular doctors found",
          data: [],
        })
        .code(200);
    }

    const doctorIds = popularDoctors.map((d) => d.doctor_id);

    // STEP 2: Fetch full doctor details without duplicates
    const doctors = await Doctors.findAll({
      where: { id: { [Op.in]: doctorIds } },
      include: [
        { model: Files, as: "profile_image", attributes: ["files_url"], required: false },
        { model: Files, as: "registration_certificate", attributes: ["files_url"], required: false },
        { model: Files, as: "medical_degree_certificate", attributes: ["files_url"], required: false },
        { model: Files, as: "government_id_file", attributes: ["files_url"], required: false },
        { model: Files, as: "pan_card_file", attributes: ["files_url"], required: false },
        { model: Adresses },
        { model: Doctorsavailability },
        { model: Specialization }
      ],
      distinct: true,      // 🔥 Prevents duplicate records
      nest: true,
    });

    // ► Convert into map for fast lookup
    const doctorMap = {};
    for (const doc of doctors) {
      doctorMap[doc.id] = doc;
    }

    // STEP 3: Build final output IN THE SAME SORT ORDER
    const mapped = await Promise.all(
      popularDoctors.map(async (pop) => {
        const doc = doctorMap[pop.doctor_id];
        if (!doc) return null;

        const clean = doc.toJSON();

        return {
          ...clean,
          completed_appointments: pop.completed_count,

          profile_image: clean.profile_image?.files_url
            ? await FileFunctions.getFromS3(clean.profile_image.files_url)
            : null,

          registration_certificate: clean.registration_certificate?.files_url
            ? await FileFunctions.getFromS3(clean.registration_certificate.files_url)
            : null,

          medical_degree_certificate: clean.medical_degree_certificate?.files_url
            ? await FileFunctions.getFromS3(clean.medical_degree_certificate.files_url)
            : null,

          government_id: clean.government_id_file?.files_url
            ? await FileFunctions.getFromS3(clean.government_id_file.files_url)
            : null,

          pan_card: clean.pan_card_file?.files_url
            ? await FileFunctions.getFromS3(clean.pan_card_file.files_url)
            : null,
        };
      })
    );

    return h
      .response({
        success: true,
        message: "Popular doctors (admin) fetched successfully",
        data: mapped.filter(Boolean), // null check
      })
      .code(200);

  } catch (err) {
    console.error("Error fetching popular doctors (admin):", err);
    return h.response({ success: false, message: err.message }).code(500);
  }
};



const updateDoctoreDetailsByAdmin = async (req, h) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { doctor_id } = req.params;
        const {
            full_name, gender, date_of_birth, phone, email,
            specialization, years_of_experience, registration_number,
            registration_certificate, medical_degree_certificate,
            consultation_fee, consultation_modes, languages_spoken,
            profile_image, government_id, pan_card
        } = req.payload;

        const doctor = await Doctors.findOne({ where: { id: doctor_id } });
        if (!doctor) throw new Error('Doctor not found');

        // declare IDs
        let profileFileId = null, govFileId = null, panFileId = null;
        let regCertFileId = null, degreeCertFileId = null;

        // Upload files (same logic as your create API)
        if (profile_image) {
            const uploadedfile = await FileFunctions.uploadToS3(profile_image.filename, 'uploads/profile_images', fs.readFileSync(profile_image.path));
            const profileFile = await Files.create({
                file_url: uploadedfile.key,
                extension: uploadedfile.key.split('.').pop(),
                original_name: uploadedfile.key,
                size: fs.statSync(profile_image.path).size
            });
            profileFileId = profileFile.id;
        }

        if (government_id) {
            const uploadedfile = await FileFunctions.uploadToS3(government_id.filename, 'uploads/government_ids', fs.readFileSync(government_id.path));
            const govFile = await Files.create({
                file_url: uploadedfile.key,
                extension: uploadedfile.key.split('.').pop(),
                original_name: uploadedfile.key,
                size: fs.statSync(government_id.path).size
            });
            govFileId = govFile.id;
        }

        if (pan_card) {
            const uploadedfile = await FileFunctions.uploadToS3(pan_card.filename, 'uploads/pan_cards', fs.readFileSync(pan_card.path));
            const panFile = await Files.create({
                file_url: uploadedfile.key,
                extension: uploadedfile.key.split('.').pop(),
                original_name: uploadedfile.key,
                size: fs.statSync(pan_card.path).size
            });
            panFileId = panFile.id;
        }

        if (registration_certificate) {
            const uploadedfile = await FileFunctions.uploadToS3(registration_certificate.filename, 'uploads/registration_certificates', fs.readFileSync(registration_certificate.path));
            const regFile = await Files.create({
                file_url: uploadedfile.key,
                extension: uploadedfile.key.split('.').pop(),
                original_name: uploadedfile.key,
                size: fs.statSync(registration_certificate.path).size
            });
            regCertFileId = regFile.id;
        }

        if (medical_degree_certificate) {
            const uploadedfile = await FileFunctions.uploadToS3(medical_degree_certificate.filename, 'uploads/medical_degree_certificates', fs.readFileSync(medical_degree_certificate.path));
            const degreeFile = await Files.create({
                file_url: uploadedfile.key,
                extension: uploadedfile.key.split('.').pop(),
                original_name: uploadedfile.key,
                size: fs.statSync(medical_degree_certificate.path).size
            });
            degreeCertFileId = degreeFile.id;
        }

        // Update doctor
        await Doctors.update({
            full_name,
            gender,
            date_of_birth,
            phone,
            email,
            specialization,
            years_of_experience,
            registration_number,
            registration_certificate_id: regCertFileId,
            medical_degree_certificate_id: degreeCertFileId,
            consultation_fee,
            consultation_modes: JSON.stringify(consultation_modes),
            languages_spoken: JSON.stringify(languages_spoken),
            profile_image_id: profileFileId,
            government_id: govFileId,
            pan_card_id: panFileId
        }, { where: { id: doctor_id } });

        // Refetch updated doctor with all images
        const updatedDoctor = await Doctors.findOne({
            where: { id: doctor_id },
            include: [
                { model: Files, as: 'profile_image', required: false },
                { model: Files, as: 'registration_certificate', required: false },
                { model: Files, as: 'medical_degree_certificate', required: false },
                { model: Files, as: 'government_id_file', required: false },
                { model: Files, as: 'pan_card_file', required: false }
            ],
            raw: true,
            nest: true,
            mapToModel: true
        });

        // Map files to S3 URLs
        const doctor_data = {
            ...updatedDoctor,
            profile_image: updatedDoctor.profile_image?.files_url ? await FileFunctions.getFromS3(updatedDoctor.profile_image.files_url) : null,
            registration_certificate: updatedDoctor.registration_certificate?.files_url ? await FileFunctions.getFromS3(updatedDoctor.registration_certificate.files_url) : null,
            medical_degree_certificate: updatedDoctor.medical_degree_certificate?.files_url ? await FileFunctions.getFromS3(updatedDoctor.medical_degree_certificate.files_url) : null,
            government_id: updatedDoctor.government_id_file?.files_url ? await FileFunctions.getFromS3(updatedDoctor.government_id_file.files_url) : null,
            pan_card: updatedDoctor.pan_card_file?.files_url ? await FileFunctions.getFromS3(updatedDoctor.pan_card_file.files_url) : null
        };

        return h.response({
            success: true,
            message: 'Doctor details updated successfully',
            data: doctor_data
        }).code(200);

    } catch (err) {
        console.error(err);
        return h.response({ success: false, message: err.message }).code(500);
    }
};


const deleteDoctor = async (req, h) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) {
            throw new Error('Session expired');
        }
        const { doctor_id } = req.params;
        const doctor = await Doctors.findOne({
            where: { id: doctor_id }
        });
        if (!doctor) {
            throw new Error('Doctor not found');
        }
        await doctor.destroy();
        return h.response({
            success: true,
            message: 'Doctor deleted successfully',
            data: doctor
        }).code(200);
    
    } catch (err) {
        console.error(err);
        return h.response({
            success: false,
            message: err.message
        });
    }
};

const CheckDoctorSlotsByAdmin = async (req, h) => {
  try {
      const session_user = req.headers.user;
      if (!session_user) {
          throw new Error('Session expired');
      }
      const { doctor_id } = req.params;
      const doctor = await Doctorsavailability.findOne({
          where: { id: doctor_id }
      });
      if (!doctor) {
          throw new Error('Doctor not found');
      }
      const slots = await Doctorsavailability.findAll({
          where: { doctor_id }
      });
      return h.response({
          success: true,
          data: slots
      }).code(200);
  } catch (error) {
      console.error(error);
      return h.response({
          success: false,
          message: error.message
      });
    
  }
}

module.exports = {
    updateBasicDetails,
    updateAddress,
    updateAvailability,
    updateStatus,
    doctorlist_user,
    doctorlist,
    fetch_single_doctor,
    fetch_popular_doctors,
    updateDoctoreDetailsByAdmin,
    deleteDoctor,
    CheckDoctorSlotsByAdmin,
    fetch_popular_doctors_admin
}


// Clinic
// 1)name
// 2)address same table
// 3)phone clinic
// 4)email clinic
// 5)image clinic,
// 6)description


// clicninc dpct
// 1)dr id
// 2)clinic id
// 3) monday start dateandend , monday end
