export async function uploadImage(request, response) {
  if (!request.file) {
    response.status(400).json({
      success: false,
      message: "Image file is required"
    });
    return;
  }

  response.status(201).json({
    success: true,
    data: {
      filename: request.file.filename,
      originalName: request.file.originalname,
      mimeType: request.file.mimetype,
      size: request.file.size,
      url: `/uploads/${request.file.filename}`
    }
  });
}
