import React from 'react';
import { IonContent, IonList, IonItem, IonMenu, IonHeader, IonToolbar, IonTitle } from '@ionic/react';
import { useHistory } from 'react-router-dom';

const Menu: React.FC = () => {
  const history = useHistory();

  return (
    <IonMenu contentId="main">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Menu</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          <IonItem button onClick={() => history.push('/home')}>Home</IonItem>
          <IonItem button onClick={() => history.push('/profile')}>Profile</IonItem>
          <IonItem button onClick={() => history.push('/about')}>About</IonItem>
          <IonItem button onClick={() => history.push('/contact')}>Contact</IonItem>
          <IonItem button onClick={() => history.push('/settings')}>Settings</IonItem>
        </IonList>
      </IonContent>
    </IonMenu>
  );
};

export default Menu;
