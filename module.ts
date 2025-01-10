import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { IonicModule } from '@ionic/angular';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
    // ...existing code...
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot({
      platform: {
        'desktop': (win) => {
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(win.navigator.userAgent);
          return !isMobile;
        }
      },
    }),
    AppRoutingModule
    // ...existing code...
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
