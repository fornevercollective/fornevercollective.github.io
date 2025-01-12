import { Camera, CameraResultType } from '@ionic-enterprise/camera';

// Example function to demonstrate usage
async function takePicture() {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: CameraResultType.Uri
  });

  // Display the image
  const imageUrl = image.webPath;
  document.getElementById('image').src = imageUrl;
}

// Call the example function
takePicture();
