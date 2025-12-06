// Quick GCS Connection Test
// Run this with: node test-gcs-connection.js

const { Storage } = require('@google-cloud/storage');
require('dotenv').config({ path: './admin/.env' });

async function testGCSConnection() {
    console.log('🧪 Testing Google Cloud Storage Connection\n');
    console.log('Configuration:');
    console.log('  Bucket:', process.env.GCS_BUCKET_NAME);
    console.log('  Credentials:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    console.log('');

    try {
        // Initialize storage
        console.log('1️⃣ Initializing Storage client...');
        const storage = new Storage();
        console.log('   ✅ Storage client created');
        console.log('   Project ID:', storage.projectId || '(default)');
        console.log('');

        // Get bucket
        console.log('2️⃣ Accessing bucket...');
        const bucketName = process.env.GCS_BUCKET_NAME;
        const bucket = storage.bucket(bucketName);
        console.log('   ✅ Bucket object created');
        console.log('');

        // Check if bucket exists
        console.log('3️⃣ Checking bucket existence...');
        const [exists] = await bucket.exists();
        if (exists) {
            console.log('   ✅ Bucket exists and is accessible!');
        } else {
            console.log('   ❌ Bucket does not exist or you don\'t have access');
            return;
        }
        console.log('');

        // Get bucket metadata
        console.log('4️⃣ Getting bucket metadata...');
        const [metadata] = await bucket.getMetadata();
        console.log('   ✅ Bucket metadata retrieved');
        console.log('   Location:', metadata.location);
        console.log('   Storage Class:', metadata.storageClass);
        console.log('   Created:', metadata.timeCreated);
        console.log('');

        // Try to list files (just first 5)
        console.log('5️⃣ Listing files in bucket...');
        const [files] = await bucket.getFiles({ maxResults: 5 });
        console.log(`   ✅ Found ${files.length} file(s) (showing max 5)`);
        files.forEach(file => {
            console.log(`      - ${file.name}`);
        });
        console.log('');

        // Try to create a test file
        console.log('6️⃣ Testing write permissions...');
        const testFileName = `test/connection-test-${Date.now()}.txt`;
        const testFile = bucket.file(testFileName);
        await testFile.save('This is a test file from GCS connection test', {
            metadata: {
                contentType: 'text/plain',
            },
        });
        console.log('   ✅ Test file created successfully!');
        console.log('   File:', testFileName);
        console.log('');

        // Delete test file
        console.log('7️⃣ Cleaning up test file...');
        await testFile.delete();
        console.log('   ✅ Test file deleted');
        console.log('');

        console.log('🎉 SUCCESS! All tests passed.');
        console.log('Your GCS configuration is working correctly.');
        console.log('');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('');

        if (error.code === 403) {
            console.error('🔒 Permission Denied');
            console.error('   Possible causes:');
            console.error('   1. Service account lacks necessary permissions');
            console.error('   2. Bucket is in a different project');
            console.error('   3. Service account key is from the old Google Cloud account');
            console.error('');
            console.error('   Solution:');
            console.error('   - Create a NEW service account in your NEW Google Cloud project');
            console.error('   - Download a NEW JSON key file');
            console.error('   - Update GOOGLE_APPLICATION_CREDENTIALS in admin/.env');
        } else if (error.code === 404) {
            console.error('🪣 Bucket Not Found');
            console.error('   Possible causes:');
            console.error('   1. Bucket name is incorrect');
            console.error('   2. Bucket is in a different project');
            console.error('   3. Service account doesn\'t have access to this bucket');
            console.error('');
            console.error('   Solution:');
            console.error('   - Verify bucket name in GCS console');
            console.error('   - Make sure you\'re using credentials from the correct project');
        } else if (error.message?.includes('Could not load the default credentials')) {
            console.error('🔑 Credentials Not Found');
            console.error('   The credentials file path is incorrect or file doesn\'t exist');
            console.error('');
            console.error('   Solution:');
            console.error('   - Check GOOGLE_APPLICATION_CREDENTIALS path in admin/.env');
            console.error('   - Make sure the JSON key file exists at that location');
        }

        console.error('');
        console.error('Full error details:');
        console.error(error);
    }
}

testGCSConnection();
