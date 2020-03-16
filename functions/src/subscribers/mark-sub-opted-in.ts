import * as functions from 'firebase-functions';
import { EmailSubscriber } from '../../../shared-models/subscribers/email-subscriber.model';
import { SubOptInConfirmationData } from '../../../shared-models/subscribers/sub-opt-in-confirmation-data.model';
import { adminFirestore, publicFirestore } from '../config/db-config';
import { AdminCollectionPaths, PublicCollectionPaths } from '../../../shared-models/routes-and-paths/fb-collection-paths';
import { assertUID, catchErrors } from '../config/global-helpers';
import { PublicUser } from '../../../shared-models/user/public-user.model';

const markSubscriberOptedIn = async (subConfData: SubOptInConfirmationData): Promise<boolean> => {

  const adminDb: FirebaseFirestore.Firestore = adminFirestore;
  const publicDb: FirebaseFirestore.Firestore = publicFirestore;

  const subDoc: FirebaseFirestore.DocumentSnapshot = await adminDb.collection(AdminCollectionPaths.SUBSCRIBERS).doc(subConfData.subscriberId).get()
    .catch(err => {console.log(`Error fetching subscriber from admin database:`, err); return err;});
  
  if (!subDoc.exists) {
    console.log('Subscriber does not exist');
    return false;
  }

  const existingSubscriberData: EmailSubscriber = subDoc.data() as EmailSubscriber;

  if (existingSubscriberData.publicUserData.id !== subConfData.publicId) {
    console.log('Subscriber id does not match public id');
    return false;
  }

  if (existingSubscriberData.optInConfirmed) {
    console.log('Subscriber already confirmed, no action taken')
    return true;
  }

  const updateSubscriberOptInConfirmed: Partial<EmailSubscriber> = {
    optInConfirmed: true
  };

  // Mark sub opted in on admin database
  await adminDb.collection(AdminCollectionPaths.SUBSCRIBERS).doc(subConfData.subscriberId).update(updateSubscriberOptInConfirmed)
    .catch(err => {console.log(`Error updating subscriber on admin database:`, err); return err;});
  
  console.log(`Marked subscriber "${subConfData.subscriberId}" as opted in`);

  const updatePubUserOptInConfirmed: Partial<PublicUser> = {
    optInConfirmed: true
  }

  // Mark user opted in on public database
  await publicDb.collection(PublicCollectionPaths.PUBLIC_USERS).doc(subConfData.publicId).update(updatePubUserOptInConfirmed)
    .catch(err => {console.log(`Error updating public user on public database:`, err); return err;});
  
  console.log(`Marked public user "${subConfData.publicId}" as opted in`);

  return true;

}


/////// DEPLOYABLE FUNCTIONS ///////


export const markSubOptedIn = functions.https.onCall( async (subData: SubOptInConfirmationData, context ) => {

  console.log('Confirm sub opt in on admin request received with this data', subData);
  assertUID(context);
  
  return catchErrors(markSubscriberOptedIn(subData));
});