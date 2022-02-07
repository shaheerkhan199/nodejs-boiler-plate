module.exports = {
  pagination: (limit, offset) => {
    return {
      limit: Number(limit) || 5,
      offset: Number(offset) || 0
    }
  }
}