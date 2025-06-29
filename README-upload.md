# 📸 คู่มือการอัพโหลดรูปใน Express API

## วิธีการอัพโหลดรูป

### 1. **การตั้งค่าที่มีอยู่แล้ว**
- ✅ มี middleware `multer` สำหรับจัดการไฟล์
- ✅ โฟลเดอร์ `./public/images` สำหรับเก็บรูป
- ✅ API endpoint `/products` สำหรับอัพโหลด

### 2. **วิธีใช้งาน**

#### **วิธีที่ 1: ใช้หน้าเว็บตัวอย่าง**
1. เปิดเบราว์เซอร์ไปที่: `http://localhost:3000/upload-example.html`
2. กรอกข้อมูลสินค้า
3. เลือกรูปภาพ
4. กดปุ่ม "อัพโหลดสินค้า"

#### **วิธีที่ 2: ใช้ API โดยตรง**

**Endpoint:** `POST /products`

**Headers:**
```
Content-Type: multipart/form-data
```

**Body (FormData):**
- `image` - ไฟล์รูปภาพ
- `product_name` - ชื่อสินค้า
- `price` - ราคา
- `amount` - จำนวน
- `description` - รายละเอียด (ไม่บังคับ)

**ตัวอย่างการใช้งานด้วย JavaScript:**
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('product_name', 'iPhone 15');
formData.append('price', '45000');
formData.append('amount', '10');
formData.append('description', 'สมาร์ทโฟนรุ่นใหม่');

fetch('/products', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

**ตัวอย่างการใช้งานด้วย cURL:**
```bash
curl -X POST http://localhost:3000/products \
  -F "image=@/path/to/image.jpg" \
  -F "product_name=iPhone 15" \
  -F "price=45000" \
  -F "amount=10" \
  -F "description=สมาร์ทโฟนรุ่นใหม่"
```

### 3. **การตอบกลับ**

**สำเร็จ:**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "product_name": "iPhone 15",
    "price": 45000,
    "amount": 10,
    "img": "1703123456789_image.jpg",
    "description": "สมาร์ทโฟนรุ่นใหม่"
  }
}
```

**ไม่สำเร็จ:**
```json
{
  "success": false,
  "message": "Product name, price and amount are required"
}
```

### 4. **การเข้าถึงรูปที่อัพโหลด**

รูปที่อัพโหลดจะถูกเก็บในโฟลเดอร์ `./public/images` และสามารถเข้าถึงได้ผ่าน URL:
```
http://localhost:3000/uploads/[ชื่อไฟล์]
```

ตัวอย่าง: `http://localhost:3000/uploads/1703123456789_image.jpg`

### 5. **ข้อกำหนดไฟล์รูป**

- **ประเภทไฟล์:** รูปภาพ (jpg, png, gif, webp, etc.)
- **ขนาดไฟล์:** ไม่จำกัด (ขึ้นอยู่กับการตั้งค่า multer)
- **ชื่อไฟล์:** จะถูกสร้างอัตโนมัติเป็น `timestamp_originalname`

### 6. **การแก้ไขปัญหา**

#### **ปัญหา: ไม่สามารถอัพโหลดได้**
- ตรวจสอบว่าเซิร์ฟเวอร์กำลังทำงาน
- ตรวจสอบว่าโฟลเดอร์ `./public/images` มีอยู่
- ตรวจสอบสิทธิ์การเขียนไฟล์

#### **ปัญหา: รูปไม่แสดง**
- ตรวจสอบ URL ของรูป
- ตรวจสอบว่าไฟล์ถูกอัพโหลดไปยังโฟลเดอร์ที่ถูกต้อง

### 7. **การตั้งค่าเพิ่มเติม**

หากต้องการปรับแต่งการอัพโหลด สามารถแก้ไขไฟล์ `middleware/image.js`:

```javascript
// จำกัดขนาดไฟล์
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// จำกัดประเภทไฟล์
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};
```

---

**หมายเหตุ:** ตรวจสอบให้แน่ใจว่าเซิร์ฟเวอร์ Express กำลังทำงานก่อนทดสอบการอัพโหลดรูป