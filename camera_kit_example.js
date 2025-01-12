import React from 'react';
import { View, Button, Image } from 'react-native';
import { CameraKitCameraScreen } from 'react-native-camera-kit';

export default function CameraKitExample() {
  const [imageUri, setImageUri] = React.useState(null);

  const onCapture = (event) => {
    setImageUri(event.uri);
  };

  return (
    <View style={{ flex: 1 }}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={{ flex: 1 }} />
      ) : (
        <CameraKitCameraScreen
          actions={{ rightButtonText: 'Done' }}
          onBottomButtonPressed={onCapture}
          flashImages={{
            on: require('./assets/flashOn.png'),
            off: require('./assets/flashOff.png'),
            auto: require('./assets/flashAuto.png'),
          }}
          cameraFlipImage={require('./assets/cameraFlipIcon.png')}
          captureButtonImage={require('./assets/cameraButton.png')}
        />
      )}
      <Button title="Take Picture" onPress={() => setImageUri(null)} />
    </View>
  );
}
