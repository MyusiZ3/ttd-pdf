# Rencana Implementasi: Aplikasi Web Pembubuhan Tanda Tangan PDF Premium

Aplikasi ini dirancang sebagai Single-Page Application (SPA) modern yang tangguh dengan visual yang sangat premium (glassmorphic dark theme, micro-animations, dan transisi halus). Aplikasi ini memungkinkan pengguna untuk mengunggah dokumen PDF, menggambar tanda tangan digital secara presisi, mengunggah foto tanda tangan kertas dengan fitur penghapus latar belakang otomatis, menyeret (drag-and-drop) dan mengubah ukuran (resize) tanda tangan di atas halaman PDF, serta mengunduh hasil PDF akhir yang telah ditandatangani.

---

## 🛠️ Stack Teknologi & Pustaka

1. **Struktur**: HTML5 Semantik.
2. **Gaya (CSS)**: Vanilla CSS Modern (Custom Properties, Flexbox, Grid, Glassmorphism, CSS Variables, Responsive Design).
3. **Logika**: Vanilla ES6+ Javascript.
4. **Rendering PDF**: [PDF.js (v3.11.174)](https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js) dari jsDelivr CDN.
5. **Modifikasi & Penyusunan PDF**: [pdf-lib (v1.17.1)](https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js) dari unpkg CDN.
6. **Ikon**: [FontAwesome / Lucide-like SVG Icons** terintegrasi secara inline atau via CDN.

---

## 🎨 Desain Sistem & Estetika (Premium Dark Glassmorphism)

Aplikasi akan menggunakan palet warna gelap (cyberpunk/dark luxury) dengan gradien aksen ungu-indigo (Indigo Nebula) dan cyan cerah (Cyber Cyan).

### Palet Warna (CSS Variables)
- **Background Utama**: HSL(222, 47%, 7%) — Deep Obsidian Space
- **Background Panel (Card)**: HSLA(223, 47%, 12%, 0.7) dengan efek `backdrop-filter: blur(16px)`
- **Aksen Utama (Primary)**: HSL(263, 90%, 65%) — Royal Violet
- **Aksen Sekunder (Secondary)**: HSL(190, 95%, 50%) — Cyber Cyan
- **Warna Teks**: HSL(210, 40%, 98%) — Pure Light
- **Warna Teks Redup**: HSL(215, 20%, 65%) — Slate Gray
- **Gradien Utama**: `linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)`
- **Bayangan (Box Shadow)**: Bayangan halus berpendar (`glow shadow`) dan bayangan tumpang tindih untuk kesan 3D.

---

## 📐 Fitur Utama & Alur Kerja

### 1. Dashboard Landing (Zone Unggah)
- Area Drag & Drop yang interaktif dengan animasi denyut visual (`pulse glow`) ketika file PDF didekatkan.
- Info ukuran file maksimum, format file yang didukung, dan petunjuk penggunaan yang elegan.

### 2. Penampil Halaman PDF Berurutan (PDF Viewer Canvas)
- Halaman PDF akan dirender berurutan ke dalam elemen `<canvas>` HTML5 menggunakan PDF.js.
- Setiap canvas akan dibungkus oleh container `.page-wrapper` yang menampung overlay interaktif untuk menempatkan tanda tangan.
- Skala halaman yang dinamis dan pas dengan lebar layar (`responsive scaling`).

### 3. Studio Pembuatan Tanda Tangan (Signature Pad)
Dua opsi pembuatan tanda tangan dalam modal interaktif:
- **Tab Menggambar (Draw)**:
  - Kanvas tanda tangan dengan algoritma kurva Bezier kuadratik agar garis tanda tangan terlihat halus, alami, dan bebas pixel kasar.
  - Pilihan warna pena (Hitam, Biru Royal, Merah Klasik).
  - Pilihan ketebalan pena (slider interaktif).
  - Tombol Bersihkan (Clear), Batalkan (Undo), dan Simpan.
- **Tab Unggah Gambar (Upload)**:
  - Unggah gambar (PNG, JPG, WebP).
  - **Premium Background Remover**: Algoritma canvas piksel untuk menghapus warna putih/terang latar belakang agar tanda tangan kertas menjadi transparan secara otomatis! Terdapat slider ambang batas (`threshold`) untuk menyesuaikan sensitivitas transparansi latar belakang.
- **Penyimpanan Lokal (localStorage)**:
  - Tanda tangan yang berhasil dibuat/diunggah akan disimpan di penyimpanan lokal, sehingga pengguna dapat menggunakannya kembali langsung tanpa perlu menggambar ulang di sesi berikutnya.

### 4. Sistem Penyeretan & Pengubahan Ukuran Interaktif (Drag, Resize & Drop)
- Menggunakan **Pointer Events** untuk memastikan dukungan penuh di perangkat desktop (mouse) maupun mobile (touch screen).
- Bingkai penyeleksi tanda tangan yang indah pada saat dihover/fokus:
  - Tombol hapus (`Delete`) kecil di pojok kanan atas elemen.
  - Tombol duplikat (`Duplicate`) kecil di pojok kiri atas.
  - Handle pengubah ukuran (`Resize handle`) berbentuk lingkaran kecil berpendar di pojok kanan bawah.
  - Pembatasan batas seret agar tanda tangan tidak bisa keluar dari halaman PDF aktif.

### 5. Kompilasi PDF & Ekspor Presisi tinggi
- Saat menekan tombol **"Simpan PDF"**:
  - Animasi progres loading yang premium.
  - Membaca koordinat visual pixel tanda tangan, lalu menerjemahkannya ke koordinat PDF standar (menghitung perbedaan origin top-left HTML ke bottom-left PDF serta perbedaan skala DPI / points).
  - Memasukkan gambar tanda tangan (dalam format PNG/Base64) langsung ke halaman PDF asli dengan resolusi aslinya menggunakan `pdf-lib`.
  - Mengunduh file PDF yang dihasilkan dengan nama asli yang diberi akhiran `_signed.pdf`.

---

## 📂 Struktur File

Kami akan membuat file-file berikut di direktori workspace `c:\Users\muham\Documents\Github\ttd-pdf`:
- `index.html` - Struktur utama aplikasi.
- `styles.css` - Desain UI, animasi, tema gelap, modal, sidebar, dan container canvas.
- `app.js` - Logika penanganan file PDF, manipulasi canvas, algoritma Bezier tanda tangan, penyeretan/resizing overlay, integrasi `pdf-lib` dan unduhan hasil akhir.

---

## ⚡ Langkah Implementasi Detail

### Langkah 1: HTML & CSS Styling
Membuat kerangka dokumen HTML5 yang sangat bersih dan terstruktur dengan CSS modern. Desain sidebar yang ramping untuk meletakkan file dan mengelola tanda tangan, serta area viewport PDF yang luas.

### Langkah 2: Logika Menggambar Tanda Tangan (Signature Canvas)
Menggunakan algoritma input pointer untuk mencatat titik koordinat dan membuat kurva halus menggunakan metode `quadraticCurveTo` pada elemen kanvas 2D.

### Langkah 3: Logika Rendering PDF.js
Menginisialisasi driver PDF.js, memuat file, merender setiap halaman ke kanvas 2D, dan membuat kontainer overlay dinamis untuk menampung tanda tangan dengan ukuran piksel yang persis sama dengan kanvas halaman.

### Langkah 4: Logika Drag and Drop & Resizing (Interactive Elements)
Membuat kelas Javascript `DraggableElement` yang mengelola event penarikan dan penskalaan elemen tanda tangan di dalam container halaman.

### Langkah 5: Integrasi Kompilasi pdf-lib
Mengimplementasikan fungsi kompilasi yang mengumpulkan semua data elemen aktif (halaman, koordinat X, koordinat Y, lebar, tinggi, dan base64 gambar tanda tangan), lalu memetakan serta menyematkannya ke dalam dokumen `pdf-lib` asli.
