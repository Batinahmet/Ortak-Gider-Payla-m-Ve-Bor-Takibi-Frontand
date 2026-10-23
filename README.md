# Ortak Gider – Frontend

Ortak gider paylaşımı ve borç takibi uygulamasının arayüzü (HTML/CSS/JS, derleme gerektirmez).
API ayrı depodadır: **Ortak-Gider-Payla-m-Ve-Bor-Takibi-backand**.

## Çalıştırma

1. Backend'i başlat (`http://localhost:3000`).
2. Backend'in `.env` dosyasında `CORS_ORIGIN=http://localhost:5173` olduğundan emin ol.
3. Bu klasörde statik bir sunucu aç:

```bash
npx serve -l 5173 .
```

Backend adresi `config.js` içindeki `API_URL` ile ayarlanır. Gizli anahtar (API key vb.) bu depoya yazılmaz; yapay zeka anahtarı sadece backend'dedir.

## Ekranlar

Giriş/kayıt, gruplarım ve davet koduyla katılma, grup sayfası (harcama ekleme, fişten ekleme, "kim kime ne kadar", bakiyeler, geçmiş, etkinlik akışı, yapay zeka borç özeti).

## Kimlik doğrulama ekranları (Hafta 5)

- **Giriş / kayıt:** şifreyi göster seçeneği, hatalı girişte genel mesaj, çok denemede kilit mesajı (429), oturum süresi dolunca "Oturum süren doldu" bildirimi.
- **Hesabım (`#/hesap`):** e-posta ve rol bilgisi, ad değiştirme, şifre değiştirme (mevcut şifre istenir, diğer oturumlar kapanır), çıkış.
- **Yönetim (`#/admin`):** kullanıcı listesi ve rol değiştirme. Bağlantı yalnızca yöneticide görünür, ama asıl koruma sunucudadır: yönetici olmayan biri adresi elle açsa bile sunucu 403 döner ve ekran hata mesajı gösterir.
- Oturum belirteci `localStorage` içinde tutulur. Kullanıcıdan gelen tüm metinler `esc()` ile kaçırılarak basılır (XSS önlemi).
