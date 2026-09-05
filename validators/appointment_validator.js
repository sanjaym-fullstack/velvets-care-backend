const Joi = require('joi');

const appointmentValidator = Joi.object({
    appointment_time: Joi.string().required().messages({
        'string.base': 'Appointment time must be a string',
        'string.empty': 'Appointment time is required',
        'any.required': 'Appointment time is required',
    }),
    appointment_date: Joi.string().required().messages({
        'string.base': 'Appointment date must be a string',
        'string.empty': 'Appointment date is required',
        'any.required': 'Appointment date is required',
    }),
    doctor_id: Joi.number().required().messages({
        'number.base': 'Doctor ID must be a number',
        'any.required': 'Doctor ID is required',
    }),
    patient_id: Joi.number().required().messages({
        'number.base': 'Patient ID must be a number',
        'any.required': 'Patient ID is required',
    }),
    reason: Joi.string().required().messages({
        'string.base': 'Reason must be a string',
        'string.empty': 'Reason is required',
        'any.required': 'Reason is required',
    }),
    payment_id: Joi.string().required().messages({
        'string.base': 'Payment ID must be a string',
        'string.empty': 'Payment ID is required',
        'any.required': 'Payment ID is required',
    }),
    payment_signature: Joi.string().required().messages({
        'string.base': 'Payment signature must be a string',
        'string.empty': 'Payment signature is required',
        'any.required': 'Payment signature is required',
    }),
    order_id: Joi.string().required().messages({
        'string.base': 'Order ID must be a string',
        'string.empty': 'Order ID is required',
        'any.required': 'Order ID is required',
    }),
    consultation_fee: Joi.number().required().messages({
        'number.base': 'Consultation fee must be a number',
        'any.required': 'Consultation fee is required',
    }),
    consultation_modes: Joi.string().required().messages({
        'string.base': 'Consultation modes must be a string',
        'string.empty': 'Consultation modes is required',
        'any.required': 'Consultation modes is required',
    }),
})

const razorpayPaymentValidator = Joi.object({
    doctor_id: Joi.number().required().messages({
        'number.base': 'Doctor ID must be a number',
        'any.required': 'Doctor ID is required',
    }),
    appointment_date: Joi.string().required().messages({
        'string.base': 'Appointment date must be a string',
        'string.empty': 'Appointment date is required',
        'any.required': 'Appointment date is required',
    }),
    appointment_time: Joi.string().required().messages({
        'string.base': 'Appointment time must be a string',
        'string.empty': 'Appointment time is required',
        'any.required': 'Appointment time is required',
    }),
})

const updateAppointmentValidator = Joi.object({
    appointment_time: Joi.string().required().messages({
        'string.base': 'Appointment time must be a string',
        'string.empty': 'Appointment time is required',
        'any.required': 'Appointment time is required',
    }),
    appointment_date: Joi.string().required().messages({
        'string.base': 'Appointment date must be a string',
        'string.empty': 'Appointment date is required',
        'any.required': 'Appointment date is required',
    }),
    doctor_id: Joi.number().required().messages({
        'number.base': 'Doctor ID must be a number',
        'any.required': 'Doctor ID is required',
    }),
    patient_id: Joi.number().required().messages({
        'number.base': 'Patient ID must be a number',
        'any.required': 'Patient ID is required',
    }),
    reason: Joi.string().required().messages({
        'string.base': 'Reason must be a string',
        'string.empty': 'Reason is required',
        'any.required': 'Reason is required',
    }),
    status: Joi.string().required().messages({
        'string.base': 'Status must be a string',
        'string.empty': 'Status is required',
        'any.required': 'Status is required',
    }),

})

const cancelAppointmentValidator = Joi.object({
    cancel_reason: Joi.string().required().messages({
        'string.base': 'Cancel reason must be a string',
        'string.empty': 'Cancel reason is required',
        'any.required': 'Cancel reason is required',
    }),
})

const fecthAppointmentsValidator = Joi.object({
    page: Joi.number().allow(null).messages({
        'number.base': 'Page must be a number',
    }),
    date: Joi.string().allow(null).messages({
        'string.base': 'Date must be a string',
    }),
    limit: Joi.number().allow(null).messages({
        'number.base': 'Limit must be a number',
    }),
    doctor_id: Joi.number().allow(null).messages({
        'number.base': 'Doctor ID must be a number',
    }),
    patient_id: Joi.number().allow(null).messages({
        'number.base': 'Patient ID must be a number',
    }),
    status: Joi.string().allow(null).messages({
        'string.base': 'Status must be a string',
    }),
})
const fetchdoctorAppointmentsValidator = Joi.object({
    status: Joi.string().allow(null).messages({
        'string.base': 'Status must be a string',
    }),
    date: Joi.string().allow(null).messages({
        'string.base': 'Date must be a string',
    }),
})
const appointment = Joi.object({
    id: Joi.number().required().messages({
        'number.base': 'Appointment ID must be a number',
        'any.required': 'Appointment ID is required',
    }),
})

const slotcheckingValidator = Joi.object({
    doctor_id: Joi.number().required().messages({
        'number.base': 'Doctor ID must be a number',
        'any.required': 'Doctor ID is required',
    }),
    appointment_date: Joi.string().required().messages({
        'string.base': 'Appointment date must be a string',
        'string.empty': 'Appointment date is required',
        'any.required': 'Appointment date is required',
    }),
});

const updateAppointmentStatusValidator = Joi.object({
    status: Joi.string().valid('no_show', 'completed').required().messages({
        'string.base': 'Status must be a string',
        'string.empty': 'Status is required',
        'any.required': 'Status is required',
        'any.only': 'Status must be no_show or completed',
    }),

});
const UpdateAppointmentStatusParams = Joi.object({
    appointmentId: Joi.number().integer().required().messages({
        'number.base': 'Appointment ID must be a number',
        'number.integer': 'Appointment ID must be an integer',
        'any.required': 'Appointment ID is required',
    }),
});
const createAppointmentAdminValidator = Joi.object({
    doctor_id: Joi.number().required().messages({
        'number.base': 'Doctor ID must be a number',
        'any.required': 'Doctor ID is required',
    }),
    patient_id: Joi.number().required().messages({
        'number.base': 'Patient ID must be a number',
        'any.required': 'Patient ID is required',
    }),
    appointment_date: Joi.string().required().messages({
        'string.base': 'Appointment date must be a string',
        'string.empty': 'Appointment date is required',
        'any.required': 'Appointment date is required',
    }),
    appointment_time: Joi.string().required().messages({
        'string.base': 'Appointment time must be a string',
        'string.empty': 'Appointment time is required',
        'any.required': 'Appointment time is required',
    }),
    reason: Joi.string().required().messages({
        'string.base': 'Reason must be a string',
        'string.empty': 'Reason is required',
        'any.required': 'Reason is required',
    }),
    consultation_fee: Joi.number().required().messages({
        'number.base': 'Consultation fee must be a number',
        'any.required': 'Consultation fee is required',
    }),
    consultation_modes: Joi.string().required().messages({
        'string.base': 'Consultation modes must be a string',
        'string.empty': 'Consultation modes is required',
        'any.required': 'Consultation modes is required',
    }),
});

const callbackValidator = Joi.object({
    razorpay_payment_id: Joi.string().required().messages({
        'string.base': 'Payment ID must be a string',
        'string.empty': 'Payment ID is required',
        'any.required': 'Payment ID is required',
    }),
    razorpay_order_id: Joi.string().required().messages({
        'string.base': 'Order ID must be a string',
        'string.empty': 'Order ID is required',
        'any.required': 'Order ID is required',
    }),
    razorpay_signature: Joi.string().required().messages({
        'string.base': 'Signature must be a string',
        'string.empty': 'Signature is required',
        'any.required': 'Signature is required',
    }),
}).unknown();


module.exports = {
    callbackValidator,
    appointmentValidator,
    razorpayPaymentValidator,
    updateAppointmentValidator,
    cancelAppointmentValidator,
    fecthAppointmentsValidator,
    fetchdoctorAppointmentsValidator,
    appointment,
    slotcheckingValidator,
    updateAppointmentStatusValidator,
    UpdateAppointmentStatusParams,
    createAppointmentAdminValidator
}