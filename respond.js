const { STATUS_CODES } = require("http");
const express = require("express");

/**
 * @param {express.Response} res
 * @param {number} status
 * @param {object} data
 */
module.exports = (res, status, data = {}) => {
    if (!data || typeof data != "object") return res.status(503).json({
        message: `${503}: ${STATUS_CODES[503]}`
    });
    res.status(status).json({
        message: `${status}: ${STATUS_CODES[status]}`,
        ...data
    }).end();
}
