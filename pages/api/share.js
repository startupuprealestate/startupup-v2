import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDsEeGxKA90-URCn06F-K3U2dvlISf_2Jo",
  authDomain: "startup-up-realestate.firebaseapp.com",
  projectId: "startup-up-realestate",
  storageBucket: "startup-up-realestate.firebasestorage.app",
  messagingSenderId: "750265634166",
  appId: "1:750265634166:web:a4f6cd0a59db8c685fbe57"
};

// Initialize Firebase (ป้องกันการ Init ซ้ำในฝั่ง Server)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const generatePropSlug = (p) => {
    if (!p) return '';
    if (p.custom_id) return encodeURIComponent(p.custom_id);
    return p.id; 
};

export default async function handler(req, res) {
  const propertySlug = req.query.property;

  // หากไม่มี property ส่งมา ให้เด้งกลับหน้าหลัก
  if (!propertySlug) {
    return res.redirect('/');
  }

  try {
    // 1. ดึงข้อมูลจาก Firestore
    const propsRef = collection(db, 'artifacts', 'startup-up-realestate', 'public', 'data', 'properties');
    const snapshot = await getDocs(propsRef);
    const properties = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. ค้นหาบ้านที่ตรงกับ property URL Parameter
    let target = decodeURIComponent(propertySlug).toLowerCase().trim();
    
    let prop = properties.find(p => {
        const customId = String(p.custom_id || '').toLowerCase().trim();
        const houseNo = String(p.house_number || '').toLowerCase().trim();
        const docId = String(p.id || '').toLowerCase().trim();
        const genSlug = String(generatePropSlug(p)).toLowerCase().trim();
        let decodedGenSlug = genSlug;
        try { decodedGenSlug = decodeURIComponent(genSlug); } catch(e) {}
        
        return customId === target || 
               houseNo === target || 
               docId === target ||
               genSlug === target ||
               decodedGenSlug === target ||
               customId.replace(/\//g, '-') === target ||
               houseNo.replace(/\//g, '-') === target;
    });

    // 3. กำหนดค่าเริ่มต้นสำหรับ Meta Tags
    let title = 'STARTUP UP - จุดเริ่มต้นของคนอยากมีบ้าน';
    let description = 'ค้นหาบ้าน ทาวน์เฮาส์ บ้านเดี่ยว ทำเลดี พร้อมบริการสินเชื่อ';
    let imageUrl = 'https://res.cloudinary.com/dm2wr55r5/image/upload/v1773023427/LOGO_%E0%B9%80%E0%B8%82%E0%B8%B5%E0%B8%A2%E0%B8%A7%E0%B9%82%E0%B8%9B%E0%B8%A3%E0%B9%88%E0%B8%87_vhyhyo.png';

    // 4. หากเจอข้อมูลบ้าน ให้อัปเดต Meta Tags
    if (prop) {
        const propName = prop.project_name || '';
        const houseNo = prop.house_number ? `บ้านเลขที่ ${prop.house_number}` : '';
        title = `${propName} ${houseNo} | STARTUP UP`;
        
        if (prop.price) {
            description = `ราคา: ฿ ${Number(String(prop.price).replace(/,/g, '')).toLocaleString()} | ${prop.main_location || prop.district || ''}`;
        }
        
        imageUrl = (prop.images && prop.images.length > 0) ? prop.images[0] : (prop.imageUrl || imageUrl);
        
        // ทำให้ภาพ Cloudinary โหลดเร็วและขนาดพอดีกับโซเชียลมีเดีย
        if (imageUrl.includes('cloudinary.com')) {
            imageUrl = imageUrl.replace('/upload/', `/upload/f_auto,q_auto,w_1200,h_630,c_limit/`);
        }
    }

    // 5. สร้าง HTML ส่งกลับไป (มี Meta tags สำหรับ Bot และ Script ย้ายหน้าสำหรับผู้ใช้)
    const html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        
        <!-- Open Graph / Facebook / LINE -->
        <meta property="og:type" content="website" />
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${imageUrl}" />
        <meta property="og:url" content="https://startupuprealestate.vercel.app/api/share?property=${encodeURIComponent(propertySlug)}" />
        
        <!-- Twitter -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="${imageUrl}" />

        <!-- ย้ายหน้าไปยัง URL หลัก (React App) อัตโนมัติ -->
        <script>
            window.location.replace("/?property=${encodeURIComponent(propertySlug)}");
        </script>
        
        <style>
          body { font-family: 'Prompt', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #ffffff; margin: 0; }
          .loader { border: 4px solid #eef3f0; border-top: 4px solid #0b3d1b; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    </head>
    <body>
        <div style="text-align: center;">
            <img src="https://res.cloudinary.com/dm2wr55r5/image/upload/v1773023427/LOGO_%E0%B9%80%E0%B8%82%E0%B8%B5%E0%B8%A2%E0%B8%A7%E0%B9%82%E0%B8%9B%E0%B8%A3%E0%B9%88%E0%B8%87_vhyhyo.png" alt="Startup Up" style="width: 120px; margin-bottom: 20px;" />
            <div class="loader" style="margin: 0 auto 20px;"></div>
            <p style="color: #666; font-size: 14px;">กำลังพาท่านไปยังรายละเอียดบ้าน...</p>
        </div>
    </body>
    </html>
    `;

    // ตั้งค่า Header ให้ Browser และ Bot รู้ว่าเป็นหน้าเว็บ HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);

  } catch (error) {
    console.error("Error generating share page:", error);
    // หากระบบพังระหว่างดึงข้อมูล ให้ Redirect กลับไปที่หน้าบ้านแบบธรรมดา
    res.redirect(`/?property=${encodeURIComponent(propertySlug)}`);
  }
}