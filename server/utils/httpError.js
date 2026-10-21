class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Kirim error: HttpError memakai pesannya sendiri, error lain memakai pesan fallback
const sendError = (res, err, fallbackMessage) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  return res.status(500).json({ message: fallbackMessage, error: err.message });
};

module.exports = { HttpError, sendError };
