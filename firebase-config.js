/**
 * Firebase Configuration for Menus4ALL Staging Platform
 * 
 * This file configures both staging and production Firebase databases
 */

// TODO: Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCcMxsVU63wWzIYWmzk0PJ4DyWXWuUbfZY",
  authDomain: "menus4all-staging.firebaseapp.com",
  databaseURL: "https://menus4all-staging-default-rtdb.firebaseio.com",
  projectId: "menus4all-staging",
  storageBucket: "menus4all-staging.firebasestorage.app",
  messagingSenderId: "679408792426",
  appId: "1:679408792426:web:1233cf8d9f57a0f3aabl3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Database references
const stagingDb = firebase.database().ref('staging-menus');
const productionDb = firebase.database().ref('menus');
const storage = firebase.storage();

/**
 * Menu status constants
 */
const MenuStatus = {
  DRAFT: 'draft',
  READY_FOR_REVIEW: 'ready-for-review',
  APPROVED: 'approved',
  LIVE: 'live',
  NEEDS_UPDATE: 'needs-update'
};

/**
 * Get all staging menus
 */
async function getAllStagingMenus() {
  try {
    const snapshot = await stagingDb.once('value');
    return snapshot.val() || {};
  } catch (error) {
    console.error('Error fetching staging menus:', error);
    throw error;
  }
}

/**
 * Get single menu by ID
 */
async function getMenuById(menuId) {
  try {
    const snapshot = await stagingDb.child(menuId).once('value');
    return snapshot.val();
  } catch (error) {
    console.error('Error fetching menu:', error);
    throw error;
  }
}

/**
 * Save menu to staging
 */
async function saveMenuToStaging(menuId, menuData) {
  try {
    const timestamp = firebase.database.ServerValue.TIMESTAMP;
    
    const dataToSave = {
      ...menuData,
      lastUpdated: timestamp,
      id: menuId
    };
    
    // If this is a new menu, set creation date
    if (!menuData.createdDate) {
      dataToSave.createdDate = timestamp;
      // Set next update due date to 3 months from now
      dataToSave.nextUpdateDue = Date.now() + (90 * 24 * 60 * 60 * 1000);
    }
    
    await stagingDb.child(menuId).set(dataToSave);
    return dataToSave;
  } catch (error) {
    console.error('Error saving menu:', error);
    throw error;
  }
}

/**
 * Update menu status
 */
async function updateMenuStatus(menuId, newStatus, reviewNotes = '') {
  try {
    const updates = {
      status: newStatus,
      lastUpdated: firebase.database.ServerValue.TIMESTAMP
    };
    
    if (reviewNotes) {
      updates.reviewNotes = reviewNotes;
    }
    
    await stagingDb.child(menuId).update(updates);
    return updates;
  } catch (error) {
    console.error('Error updating status:', error);
    throw error;
  }
}

/**
 * Push menu from staging to production
 */
async function pushMenuToProduction(menuId) {
  try {
    // Get menu from staging
    const stagingMenu = await getMenuById(menuId);
    
    if (!stagingMenu) {
      throw new Error('Menu not found in staging');
    }
    
    if (stagingMenu.status !== MenuStatus.APPROVED) {
      throw new Error('Menu must be approved before pushing to production');
    }
    
    // Prepare production data
    const productionData = {
      ...stagingMenu,
      liveDate: firebase.database.ServerValue.TIMESTAMP,
      stagingId: menuId
    };
    
    // Remove staging-specific fields
    delete productionData.status;
    delete productionData.reviewNotes;
    
    // Push to production
    await productionDb.child(menuId).set(productionData);
    
    // Update staging status to "live"
    await updateMenuStatus(menuId, MenuStatus.LIVE);
    
    // Set next update due date (3 months from now)
    await stagingDb.child(menuId).update({
      nextUpdateDue: Date.now() + (90 * 24 * 60 * 60 * 1000),
      lastPublished: firebase.database.ServerValue.TIMESTAMP
    });
    
    return productionData;
  } catch (error) {
    console.error('Error pushing to production:', error);
    throw error;
  }
}

/**
 * Delete menu from staging
 */
async function deleteMenuFromStaging(menuId) {
  try {
    await stagingDb.child(menuId).remove();
  } catch (error) {
    console.error('Error deleting menu:', error);
    throw error;
  }
}

/**
 * Check for menus needing updates
 */
async function getMenusNeedingUpdate() {
  try {
    const snapshot = await stagingDb.once('value');
    const menus = snapshot.val() || {};
    const now = Date.now();
    
    const needingUpdate = {};
    
    Object.keys(menus).forEach(menuId => {
      const menu = menus[menuId];
      if (menu.status === MenuStatus.LIVE && menu.nextUpdateDue && menu.nextUpdateDue <= now) {
        needingUpdate[menuId] = menu;
      }
    });
    
    return needingUpdate;
  } catch (error) {
    console.error('Error checking for updates:', error);
    throw error;
  }
}

/**
 * Generate unique menu ID
 */
function generateMenuId() {
  return stagingDb.push().key;
}

/**
 * Upload hero image to Firebase Storage
 */
async function uploadHeroImage(file, menuId) {
  try {
    const storageRef = storage.ref();
    const imageRef = storageRef.child(`hero-images/${menuId}/${file.name}`);
    
    const snapshot = await imageRef.put(file);
    const downloadURL = await snapshot.ref.getDownloadURL();
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/**
 * Listen for real-time updates on a menu
 */
function listenToMenu(menuId, callback) {
  return stagingDb.child(menuId).on('value', (snapshot) => {
    callback(snapshot.val());
  });
}

/**
 * Stop listening to menu updates
 */
function stopListeningToMenu(menuId) {
  stagingDb.child(menuId).off();
}

/**
 * Get menus by status
 */
async function getMenusByStatus(status) {
  try {
    const snapshot = await stagingDb.orderByChild('status').equalTo(status).once('value');
    return snapshot.val() || {};
  } catch (error) {
    console.error('Error fetching menus by status:', error);
    throw error;
  }
}

/**
 * Get menus by city
 */
async function getMenusByCity(city) {
  try {
    const snapshot = await stagingDb.orderByChild('city').equalTo(city).once('value');
    return snapshot.val() || {};
  } catch (error) {
    console.error('Error fetching menus by city:', error);
    throw error;
  }
}
