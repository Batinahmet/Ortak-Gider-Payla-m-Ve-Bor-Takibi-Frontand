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
