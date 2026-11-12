# My study – versi Laragon (PHP + MySQL)

Isi folder:
- index.html  : kerangka halaman
- style.css   : semua tampilan / warna (edit di sini kalau mau ubah desain)
- app.js      : logika aplikasi
- config.js   : PENGATURAN PRIBADI, tempat mengisi link SSO
- api.php     : backend (menghubungkan ke MySQL dan menyimpan file)
- config.php  : pengaturan koneksi database
- schema.sql  : struktur database
- uploads/    : file tugas dan materi
- polaroid/   : taruh foto polaroid kamu di sini

## Cara pasang
1. Salin folder ini ke C:\laragon\www\ dengan nama studyhub.
2. Di Laragon klik Start All.
3. Import schema.sql lewat HeidiSQL (File > Run SQL file).
4. Naikkan batas upload di php.ini: upload_max_filesize = 100M, post_max_size = 110M, lalu restart Apache.
5. Buka http://localhost/studyhub/

## Mengisi link SSO
Buka config.js dengan Notepad, isi SSO_URL, simpan, lalu refresh browser (Ctrl+F5).

## Foto polaroid
Taruh foto (jpg/png/webp) di folder polaroid/. Foto muncul acak saat membuka hadiah target Pomodoro.
