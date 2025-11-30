/**
 * Firebase Configuration
 * Connects to TWO Firebase projects:
 * 1. Staging Database (menus4all-staging) - for drafts, review, workflow
 * 2. Production Database (menus4allbeta) - for live menus on your website
 * 
 * Production path structure: restaurant-slug (flat at root)
 */

// STAGING Firebase Configuration (for workflow)
const stagingConfig = {
  apiKey: "AIzaSyCcMxsVU63wWzIYWmzk0PJ4DyWXWuUbfZY",
  authDomain: "menus4all-staging.firebaseapp.com",
  databaseURL: "https://menus4all-staging-default-rtdb.firebaseio.com",
  projectId: "menus4all-staging",
  storageBucket: "menus4all-staging.firebasestorage.app",
  messagingSenderId: "679408792426",
  appId: "1:679408792426:web:1233cf8d9f57a0f3aabl3"
};

// PRODUCTION Firebase Configuration (for live website - Menus4ALLBeta)
const productionConfig = {
  apiKey: "AIzaSyBdHxbKuf73vxe7k4XDT3qAM_NV5zWVvCY",
  authDomain: "menus4allbeta.firebaseapp.com",
  databaseURL: "https://menus4allbeta-default-rtdb.firebaseio.com",
  projectId: "menus4allbeta",
  storageBucket: "menus4allbeta.firebasestorage.app",
  messagingSenderId: "283730089741",
  appId: "1:283730089741:web:65cc602e603eebf263c244"
};

// Initialize BOTH Firebase apps
const stagingApp = firebase.initializeApp(stagingConfig, 'staging');
const productionApp = firebase.initializeApp(productionConfig, 'production');

// Database references
const stagingDb = stagingApp.database().ref();
const productionDb = productionApp.database().ref();

// Storage reference (staging only for uploads)
const storage = stagingApp.storage();

// Menu Status Constants
const MenuStatus = {
    DRAFT: 'draft',
    IN_PROGRESS: 'in-progress',
    READY_FOR_REVIEW: 'ready-for-review',
    APPROVED: 'approved',
    LIVE: 'live',
    NEEDS_UPDATE: 'needs-update'
};

/**
 * Remove undefined values from object (Firebase doesn't accept undefined)
 */
function removeUndefinedValues(obj) {
    const cleaned = {};
    Object.keys(obj).forEach(key => {
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
            cleaned[key] = obj[key];
        }
    });
    return cleaned;
}

/**
 * Generate URL-safe slug from text
 */
function generateSlug(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Get all menus from staging database
 */
async function getAllStagingMenus() {
    try {
        const snapshot = await stagingDb.child('staging-menus').once('value');
        return snapshot.val() || {};
    } catch (error) {
        console.error('Error getting staging menus:', error);
        throw error;
    }
}

/**
 * Get single menu by ID from staging
 */
async function getMenuById(menuId) {
    try {
        const snapshot = await stagingDb.child(`staging-menus/${menuId}`).once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Error getting menu:', error);
        throw error;
    }
}

/**
 * Save menu to staging database
 */
async function saveMenuToStaging(menuId, menuData) {
    try {
        const timestamp = Date.now();
        const dataToSave = {
            ...menuData,
            id: menuId,
            lastUpdated: timestamp,
            createdDate: menuData.createdDate || timestamp
        };
        
        await stagingDb.child(`staging-menus/${menuId}`).set(dataToSave);
        return menuId;
    } catch (error) {
        console.error('Error saving menu:', error);
        throw error;
    }
}

/**
 * Update menu status in staging
 */
async function updateMenuStatus(menuId, status, reviewNotes = null) {
    try {
        const updates = {
            status: status,
            lastUpdated: Date.now()
        };
        
        if (reviewNotes) {
            updates.reviewNotes = reviewNotes;
        }
        
        await stagingDb.child(`staging-menus/${menuId}`).update(updates);
    } catch (error) {
        console.error('Error updating menu status:', error);
        throw error;
    }
}

/**
 * Push menu to PRODUCTION database (Menus4ALLBeta)
 * Uses FLAT structure: restaurant-slug at root (matches existing 61 menus)
 */
async function pushMenuToProduction(menuId) {
    try {
        // Get menu from staging
        const stagingMenu = await getMenuById(menuId);
        
        if (!stagingMenu) {
            throw new Error('Menu not found in staging');
        }
        
        // Validate required fields
        if (!stagingMenu.restaurantName) {
            throw new Error('Restaurant name is required to push to production');
        }
        
        // Generate restaurant slug for production (flat structure at root)
        const restaurantSlug = generateSlug(stagingMenu.restaurantName);
        
        // Check if menu already exists in production
        const existingMenu = await productionDb.child(restaurantSlug).once('value');
        if (existingMenu.exists()) {
            const overwrite = confirm(`Menu "${stagingMenu.restaurantName}" already exists in production. Overwrite?`);
            if (!overwrite) {
                throw new Error('Push cancelled - menu already exists');
            }
        }
        
        // Prepare production data structure (matches existing menu format)
        const productionData = {
            restaurantInfo: {
                name: stagingMenu.restaurantName,
                address: stagingMenu.address || '',
                city: stagingMenu.city || '',
                state: stagingMenu.state || '',
                phone: stagingMenu.phoneNumber || '',
                cuisineType: stagingMenu.cuisineTypes?.[0] || stagingMenu.cuisineOther || '',
                dietary: stagingMenu.dietaryOptions || [],
                averageMealPrice: stagingMenu.averageMealPrice || '',
                heroImage: stagingMenu.heroImagePath || stagingMenu.heroImageURL || '',
                heroImageAlt: stagingMenu.heroImageCaption || '',
                hours: stagingMenu.hours || [],
                lat: parseFloat(stagingMenu.latitude) || 0,
                lng: parseFloat(stagingMenu.longitude) || 0,
                slug: restaurantSlug,
                googleMapsUrl: stagingMenu.latitude && stagingMenu.longitude 
                    ? `https://www.google.com/maps/search/?api=1&query=${stagingMenu.latitude},${stagingMenu.longitude}`
                    : '',
                menuIntro: stagingMenu.generalMenuNotes || '',
                disclaimer: stagingMenu.disclaimer || ''
            },
            menu: stagingMenu.menuJson || {}
        };
        
        // Remove undefined/null values from restaurantInfo
        productionData.restaurantInfo = removeUndefinedValues(productionData.restaurantInfo);
        
        console.log('Pushing to production (FLAT structure):', restaurantSlug);
        console.log('Production data:', productionData);
        
        // Save to PRODUCTION database at ROOT level (flat structure)
        await productionDb.child(restaurantSlug).set(productionData);
        
        // Update staging menu status and add production reference
        const nextUpdateDue = Date.now() + (90 * 24 * 60 * 60 * 1000); // 90 days
        await stagingDb.child(`staging-menus/${menuId}`).update({
            status: MenuStatus.LIVE,
            liveDate: Date.now(),
            productionPath: restaurantSlug,
            productionSlug: restaurantSlug,
            nextUpdateDue: nextUpdateDue,
            lastUpdated: Date.now()
        });
        
        console.log('✅ Successfully pushed to production (flat structure):', restaurantSlug);
        return restaurantSlug;
    } catch (error) {
        console.error('❌ Error pushing to production:', error);
        throw error;
    }
}

/**
 * Delete menu from staging
 */
async function deleteMenuFromStaging(menuId) {
    try {
        await stagingDb.child(`staging-menus/${menuId}`).remove();
    } catch (error) {
        console.error('Error deleting menu:', error);
        throw error;
    }
}

/**
 * Get menus needing update (3+ months old)
 */
async function getMenusNeedingUpdate() {
    try {
        const snapshot = await stagingDb.child('staging-menus').once('value');
        const menus = snapshot.val() || {};
        const now = Date.now();
        
        const needingUpdate = {};
        Object.keys(menus).forEach(id => {
            const menu = menus[id];
            if (menu.status === MenuStatus.LIVE && menu.nextUpdateDue && menu.nextUpdateDue <= now) {
                needingUpdate[id] = menu;
            }
        });
        
        return needingUpdate;
    } catch (error) {
        console.error('Error getting menus needing update:', error);
        throw error;
    }
}

/**
 * Upload hero image to Firebase Storage
 */
async function uploadHeroImage(file, menuId) {
    try {
        const fileName = `hero-images/${menuId}/${Date.now()}_${file.name}`;
        const storageRef = storage.ref(fileName);
        
        await storageRef.put(file);
        const downloadURL = await storageRef.getDownloadURL();
        
        return downloadURL;
    } catch (error) {
        console.error('Error uploading hero image:', error);
        throw error;
    }
}

/**
 * Get menus by status
 */
async function getMenusByStatus(status) {
    try {
        const snapshot = await stagingDb.child('staging-menus')
            .orderByChild('status')
            .equalTo(status)
            .once('value');
        
        return snapshot.val() || {};
    } catch (error) {
        console.error('Error getting menus by status:', error);
        throw error;
    }
}

/**
 * Get menus by city
 */
async function getMenusByCity(city) {
    try {
        const snapshot = await stagingDb.child('staging-menus')
            .orderByChild('city')
            .equalTo(city)
            .once('value');
        
        return snapshot.val() || {};
    } catch (error) {
        console.error('Error getting menus by city:', error);
        throw error;
    }
}

/**
 * Generate unique menu ID
 */
function generateMenuId() {
    return 'menu_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
