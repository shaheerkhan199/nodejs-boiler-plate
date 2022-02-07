class Response {
  failure(statusCode, errorMessage) {
    return {
      status: statusCode,
      error: {
        message: errorMessage
      }
    }
  }
  success(statusCode, value) {
    return {
      status: statusCode,
      data: value
    }
  }

}
module.exports = new Response();