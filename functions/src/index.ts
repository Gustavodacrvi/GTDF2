import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const firebase = admin.initializeApp();
const db = admin.firestore()
const FieldValue = admin.firestore.FieldValue


// APP CACHING

export const updateTaskCache = functions.firestore
  .document("users/{userId}/tasks/{taskId}")
  .onWrite((snap, context) => {
    const { userId, taskId } = context.params

    const data = snap.after.data()

    if (data !== undefined) {
      
      if (data.from !== 'watchr_web_app')
        return db.collection('users').doc(userId).collection('cache').doc('cache').set({
          tasks: {
            [taskId]: data,
          },
        }, {merge: true})

      return;
    } else return db.collection('users').doc(userId).collection('cache').doc('cache').set({
        tasks: {
          [taskId]: FieldValue.delete(),
        }
      }, {merge: true})
  })





// ATTACHMENTS

export const deleteTaskAttachments = functions.firestore
  .document("users/{userId}/tasks/{taskId}")
  .onDelete((snap, context) => {
    const { userId, taskId } = context.params;
    const bucket = firebase.storage().bucket();

    return bucket.deleteFiles({
      prefix: `attachments/${userId}/tasks/${taskId}`
    });
  });

export const deleteListAttachments = functions.firestore
.document("users/{userId}/lists/{listId}")
.onDelete((snap, context) => {
  const { userId, listId } = context.params;
  const bucket = firebase.storage().bucket();

  return bucket.deleteFiles({
    prefix: `attachments/${userId}/lists/${listId}`
  });
});

export const deleteFolderAttachments = functions.firestore
.document("users/{userId}/folders/{folderId}")
.onDelete((snap, context) => {
  const { userId, folderId } = context.params;
  const bucket = firebase.storage().bucket();

  return bucket.deleteFiles({
    prefix: `attachments/${userId}/folders/${folderId}`
  });
});
