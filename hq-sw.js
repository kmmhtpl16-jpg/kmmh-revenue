/* hq-sw.js — ตัวรับเด้งเตือนของหน้า HQ แชท (scope "chat" · ไม่ดักการโหลดหน้า · ไม่คุมหน้ารายได้อื่น)
   - แสดงแค่หัวข้อ/ข้อความที่ได้ (ฐานสร้างจากแม่แบบ ไม่มียอดเงิน) · ตัดความยาวซ้ำอีกชั้น
   - กดคำเตือน → เปิดหน้าแชทเท่านั้น (ไม่เชื่อลิงก์จากข้อความ · เทียบที่อยู่ตรงตัว) */
"use strict";
var CHAT_URL = new URL("chat.html", self.registration.scope.replace(/chat$/, "")).href;

function isChat(u) {
  try { var a = new URL(u), b = new URL(CHAT_URL); return a.origin === b.origin && a.pathname === b.pathname; } catch (_e) { return false; }
}

self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_e) { d = {}; }
  var title = String(d.title || "HQ แชท").slice(0, 60);
  var body = String(d.body || "มีข้อความใหม่ในห้อง HQ").slice(0, 120);
  var tag = /^hq-[0-9]{1,12}$/.test(String(d.tag || "")) ? d.tag : "hq-chat";
  e.waitUntil(self.registration.showNotification(title, { body: body, tag: tag, icon: "hq-icon-512.png", badge: "hq-icon-512.png" }));
});

self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if (isChat(list[i].url) && "focus" in list[i]) return list[i].focus();
    }
    return self.clients.openWindow(CHAT_URL);
  }));
});
