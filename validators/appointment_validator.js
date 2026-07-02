const Joi = require('joi');

const appointmentValidator = Joi.object({
    appointment_time: Joi.string().required().messages({
        'string.empty': 'Date is required',
        'any.required': 'Date is required',
    }),
    appointment_date: Joi.string().required().messages({
        'string.empty': 'Date is required',
        'any.required': 'Date is required',
    }),
    doctor_id: Joi.number().required().messages({
        'number.empty': 'Doctor ID is required',
        'any.required': 'Doctor ID is required',
    }),
    patient_id: Joi.number().required().messages({
        'number.empty': 'Patient ID is required',
        'any.required': 'Patient ID is required',
    }),
    reason: Joi.string().required().messages({
        'string.empty': 'Reason is required',
        'any.required': 'Reason is required',
    }),
    payment_id: Joi.string().required().messages({
        'string.empty': 'Payment status is required',
        'any.required': 'Payment status is required',
    }),
    payment_signature: Joi.string().required().messages({
        'string.empty': 'Payment signature is required',
        'any.required': 'Payment signature is required',
    }),
    order_id: Joi.string().required().messages({
        'string.empty': 'Order ID is required',
        'any.required': 'Order ID is required',
    }),
    consultation_fee: Joi.number().required().messages({
        'number.empty': 'Consultation fee is required',
        'any.required': 'Consultation fee is required',
    }),
    consultation_modes: Joi.string().required().messages({
        'string.empty': 'Consultation modes is required',
        'any.required': 'Consultation modes is required',
    }),
})

const razorpayPaymentValidator = Joi.object({
    doctor_id: Joi.number().required().messages({
        'number.empty': 'Doctor ID is required',
        'any.required': 'Doctor ID is required',
    }),
    appointment_date: Joi.string().required().messages({
        'string.empty': 'Date is required',
        'any.required': 'Date is required',
    }),
    appointment_time: Joi.string().required().messages({
        'string.empty': 'Date is required',
        'any.required': 'Date is required',
    }),
})

const updateAppointmentValidator = Joi.object({
    appointment_time: Joi.string().required().messages({
        'string.empty': 'Date is required',
        'any.required': 'Date is required',
    }),
    appointment_date: Joi.string().required().messages({
        'string.empty': 'Date is required',
        'any.required': 'Date is required',
    }),
    doctor_id: Joi.number().required().messages({
        'number.empty': 'Doctor ID is required',
        'any.required': 'Doctor ID is required',
    }),
    patient_id: Joi.number().required().messages({
        'number.empty': 'Patient ID is required',
        'any.required': 'Patient ID is required',
    }),
    reason: Joi.string().required().messages({
        'string.empty': 'Reason is required',
        'any.required': 'Reason is required',
    }),
    status: Joi.string().required().messages({
        'string.empty': 'Status is required',
        'any.required': 'Status is required',
    }),

})

const cancelAppointmentValidator = Joi.object({
    cancel_reason: Joi.string().required().messages({
        'string.empty': 'Reason is required',
        'any.required': 'Reason is required',
    }),
})

const fecthAppointmentsValidator = Joi.object({
    page: Joi.number().allow(null).messages({
        'string.empty': 'Page is required',
        'any.required': 'Page is required',
    }),
    date: Joi.string().allow(null).messages({
        'string.empty': 'Date is required',
        'any.required': 'Date is required',
    }),
    limit: Joi.number().allow(null).messages({
        'string.empty': 'Limit is required',
        'any.required': 'Limit is required',
    }),
    doctor_id: Joi.number().allow(null).messages({
        'string.empty': 'Doctor ID is required',
        'any.required': 'Doctor ID is required',
    }),
    patient_id: Joi.number().allow(null).messages({
        'string.empty': 'Patient ID is required',
        'any.required': 'Patient ID is required',
    }),
    status: Joi.string().allow(null).messages({
        'string.empty': 'Status is required',
        'any.required': 'Status is required',
    }),
})
const fetchdoctorAppointmentsValidator = Joi.object({
    status: Joi.string().allow(null).messages({
        'string.empty': 'Status is required',
        'any.required': 'Status is required',
    }),
    date: Joi.string().allow(null).messages({
        'string.empty': 'Date is required',
        'any.required': 'Date is required',
    }),
})
const appointment = Joi.object({
    id: Joi.number().required().messages({
        'number.empty': 'ID is required',
        'any.required': 'ID is required',
    }),
})

const slotcheckingValidator = Joi.object({
    doctor_id: Joi.number().required().messages({
        'number.empty': 'Doctor ID is required',
        'any.required': 'Doctor ID is required',
    }),
    appointment_date: Joi.string().required().messages({
        'string.empty': 'Date is required',
        'any.required': 'Date is required',
    }),
});

const updateAppointmentStatusValidator = Joi.object({
    status: Joi.string().valid('no_show', 'completed').required().messages({
        'string.empty': 'Status is required',
        'any.required': 'Status is required',
    }),

});
const UpdateAppointmentStatusParams = Joi.object({
    appointmentId: Joi.number().integer().required().messages({
        'string.empty': 'Appointment ID is required',
        'any.required': 'Appointment ID is required',
    }),
});
const createAppointmentAdminValidator = Joi.object({
    doctor_id: Joi.number().required().messages({
        'number.empty': 'Doctor ID is required',
        'any.required': 'Doctor ID is required',
    }),
    patient_id: Joi.number().required().messages({
        'number.empty': 'Patient ID is required',
        'any.required': 'Patient ID is required',
    }),
    appointment_date: Joi.string().required().messages({
        'string.empty': 'Appointment date is required',
        'any.required': 'Appointment date is required',
    }),
    appointment_time: Joi.string().required().messages({
        'string.empty': 'Appointment time is required',
        'any.required': 'Appointment time is required',
    }),
    reason: Joi.string().required().messages({
        'string.empty': 'Reason is required',
        'any.required': 'Reason is required',
    }),
    consultation_fee: Joi.number().required().messages({
        'number.empty': 'Consultation fee is required',
        'any.required': 'Consultation fee is required',
    }),
    consultation_modes: Joi.string().required().messages({
        'string.empty': 'Consultation modes is required',
        'any.required': 'Consultation modes is required',
    }),
});

const callbackValidator = Joi.object({
    razorpay_payment_id: Joi.string().required().messages({
        'string.empty': 'Payment ID is required',
        'any.required': 'Payment ID is required',
    }),
    razorpay_order_id: Joi.string().required().messages({
        'string.empty': 'Order ID is required',
        'any.required': 'Order ID is required',
    }),
    razorpay_signature: Joi.string().required().messages({
        'string.empty': 'Signature is required',
        'any.required': 'Signature is required',
    }),
});

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