import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable, from, throwError } from 'rxjs';
import { map, takeUntil, catchError, take, tap } from 'rxjs/operators';
import { AuthService } from 'src/app/core/services/auth.service';
import { AngularFireFunctions } from '@angular/fire/functions';
import { now } from 'moment';
import { PublicUser } from 'shared-models/user/public-user.model';
import { NavigationStamp } from 'shared-models/analytics/navigation-stamp.model';
import { EmailSubData } from 'shared-models/subscribers/email-sub-data.model';
import { EmailSubscriber } from 'shared-models/subscribers/email-subscriber.model';
import { PublicFunctionNames } from 'shared-models/routes-and-paths/fb-function-names';
import { ContactForm } from 'shared-models/user/contact-form.model';
import { SubscriptionSource } from 'shared-models/subscribers/subscription-source.model';
import { PublicCollectionPaths } from 'shared-models/routes-and-paths/fb-collection-paths';
import { SubOptInConfirmationData } from 'shared-models/subscribers/sub-opt-in-confirmation-data.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(
    private db: AngularFirestore,
    private authService: AuthService,
    private fns: AngularFireFunctions,
  ) { }

  fetchUserData(userId: string): Observable<PublicUser> {
    const userDoc = this.getUserDoc(userId);
    return userDoc
      .valueChanges()
      .pipe(
        // If logged out, this triggers unsub of this observable
        takeUntil(this.authService.unsubTrigger$),
        map(user => {
          console.log('Fetched user', user);
          return user;
        }),
        catchError(error => {
          console.log('Error fetching user', error);
          return throwError(error);
        })
      );
  }

  storeUserData(user: PublicUser): Observable<string> {
    const userDoc = this.getUserDoc(user.id) as AngularFirestoreDocument<PublicUser | Partial<PublicUser>>;
    // Use set here because may be generating a new user or updating existing user
    const fbResponse = from(userDoc.set(user, {merge: true}));
    return fbResponse.pipe(
      take(1),
      map(empty => {
        console.log('User data stored in database');
        return user.id;
      }),
      catchError(error => {
        console.log('Error storing user data', error);
        return throwError(error);
      })
    );
  }

  storeNavStamp(user: PublicUser, navStamp: NavigationStamp): Observable<string> {
    const navStampDoc = this.getNavStampDoc(user.id, navStamp.id);
    // Use set here because may be generating a new user or updating existing user
    const fbResponse = from(navStampDoc.set(navStamp, {merge: true}));
    return fbResponse.pipe(
      take(1),
      map(empty => {
        console.log('Nav stamp stored in database', navStamp);
        return user.id;
      }),
      catchError(error => {
        console.log('Error storing data in database', error);
        return throwError(error);
      })
    );
  }

  // Add user subscription to admin database
  publishEmailSubToAdminTopic(emailSubData: EmailSubData): Observable<any> {
    console.log('Transmitting subscriber to admin');

    const emailSub = this.convertSubDataToSubscriber(emailSubData);

    const publishSubFunction: (data: Partial<EmailSubscriber>) => Observable<any> = this.fns.httpsCallable(
      PublicFunctionNames.TRANSMIT_EMAIL_SUB_TO_ADMIN
    );
    const res = publishSubFunction(emailSub)
      .pipe(
        take(1),
        tap(response => {
          console.log('Subscriber transmitted to admin', response);
        }),
        catchError(error => {
          console.log('Error transmitting subscriber', error);
          return throwError(error);
        })
      );

    return res;
  }

  confirmSubOnAdmin(subConfData: SubOptInConfirmationData): Observable<boolean> {

    // const fakeServerPromise = new Promise<boolean>((resolve, reject) => {
    //   setTimeout(() => {
    //     resolve(true);
    //     // reject('Test rejection error');
    //   }, 3000);

    // });

    // const res = from(fakeServerPromise)
    //   .pipe(
    //     catchError(error => {
    //       console.log('Error transmitting subscriber', error);
    //       return throwError(error);
    //     })
    //   );

    const confirmSub: (data: SubOptInConfirmationData) => Observable<boolean> = this.fns.httpsCallable(
      PublicFunctionNames.MARK_SUB_OPTED_IN
    );
    const res = confirmSub(subConfData)
      .pipe(
        take(1),
        tap(subConfirmed => {
          console.log('Subscriber confirmation status', subConfirmed);
          if (!subConfirmed) {
            throw new Error(`Error confirming subscriber: ${subConfirmed}`);
          }
        }),
        catchError(error => {
          console.log('Error confirming subscriber', error);
          return throwError(error);
        })
      );

    return res;
  }

  publishContactFormToAdminTopic(contactForm: ContactForm): Observable<any> {
    console.log('Transmitting contact form to admin');

    const publishSubFunction: (data: ContactForm) => Observable<any> = this.fns.httpsCallable(
      PublicFunctionNames.TRANSMIT_CONTACT_FORM_TO_ADMIN
    );

    const res = publishSubFunction(contactForm)
      .pipe(
        take(1),
        tap(response => {
          console.log('Contact form transmitted to admin', response);
        }),
        catchError(error => {
          console.log('Error transmitting contact form', error);
          return throwError(error);
        })
      );

    return res;
  }

  private convertSubDataToSubscriber(subData: EmailSubData): Partial<EmailSubscriber> {
    // Ensure all key data is present
    const user: PublicUser = subData.user;
    const subSource: SubscriptionSource = subData.subSource;
    const email: string = user.billingDetails.email;

    const partialSubscriber: Partial<EmailSubscriber> = {
      id: email, // Set id to the user's email
      publicUserData: user,
      modifiedDate: now(),
      lastSubSource: subSource,
      // Sub source array is handled on the admin depending on if subscriber already exists
      // Created date is handled on the admin depending on if subscriber already exists
    };

    return partialSubscriber;
  }

  // Provides easy access to user doc throughout the app
  getUserDoc(userId: string): AngularFirestoreDocument<PublicUser> {
    return this.getUserColletion().doc<PublicUser>(userId);
  }

  private getUserColletion(): AngularFirestoreCollection<PublicUser> {
    return this.db.collection<PublicUser>(PublicCollectionPaths.PUBLIC_USERS);
  }

  private getNavStampDoc(userId: string, navStampId: string): AngularFirestoreDocument<NavigationStamp> {
    return this.getNavStampCollection(userId).doc(navStampId);
  }

  private getNavStampCollection(userId: string): AngularFirestoreCollection<NavigationStamp> {
    return this.getUserDoc(userId).collection<NavigationStamp>(PublicCollectionPaths.NAVIGATION_STAMPS);
  }


}
