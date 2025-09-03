document.addEventListener("DOMContentLoaded", () => {
  console.log("📄 formtopdf.js loaded");

  // Elements
  const form = document.getElementById('dataForm');
  const imageInput = document.getElementById('imageUpload');
  const imagePreview = document.getElementById('imagePreview');
  const deleteSelectedBtn = document.getElementById('deleteSelected');

  if (!form) {
    console.error("❌ #dataForm not found");
    return;
  }

  // In-memory list of preview images (Data URLs)
  let selectedImages = [];

  /** Render the preview tiles */
  function renderPreviews() {
    imagePreview.innerHTML = '';
    selectedImages.forEach((src) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'image-container';

      const tick = document.createElement('input');
      tick.type = 'checkbox';

      const img = document.createElement('img');
      img.src = src;
      img.alt = 'Selected image';

      wrapper.appendChild(tick);
      wrapper.appendChild(img);
      imagePreview.appendChild(wrapper);
    });
  }

  /** Handle file selection -> show previews immediately */
  imageInput?.addEventListener('change', (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        selectedImages.push(ev.target.result); // full-res Data URL for preview
        renderPreviews();
      };
      reader.readAsDataURL(file);
    });
  });

  /** Delete all checked images */
  deleteSelectedBtn?.addEventListener('click', () => {
    const checks = imagePreview.querySelectorAll('input[type="checkbox"]');
    selectedImages = selectedImages.filter((_, idx) => !checks[idx].checked);
    renderPreviews();
  });

  /** Lightweight compression (only when building the PDF) */
  function compressImage(dataUrl, maxWidth = 1200, quality = 0.92) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });
  }

  /** Build and download the PDF */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("🚀 Submit handler triggered");

    const Pno = document.getElementById('Pno').value.trim();
    const Dno = document.getElementById('Dno').value.trim();

    if (!Pno || !Dno) {
      alert('Please fill Production Number and Drawing Number.');
      return;
    }

    // ✅ ensure jsPDF works in both UMD and global builds
    const jsPDFConstructor = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
    const doc = new jsPDFConstructor('p', 'mm', 'a4');

    // Header
    doc.setFontSize(12);
    doc.text(`Production Number: ${Pno}`, 10, 12);
    doc.text(`Drawing Number: ${Dno}`, 10, 20);

    // Add each image on its own page
    for (let i = 0; i < selectedImages.length; i++) {
      const src = selectedImages[i];
      const compressed = await compressImage(src); // compress only for PDF size
      if (i > 0) doc.addPage();

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 10;
      const targetW = pageW - margin * 2;
      const targetH = pageH - 40; // leave room for header

      // Measure the image to maintain aspect ratio
      const probe = await new Promise((resolve) => {
        const im = new Image();
        im.onload = () => resolve({ w: im.width, h: im.height });
        im.src = compressed;
      });

      const imgRatio = probe.w / probe.h;
      const boxRatio = targetW / targetH;

      let w, h;
      if (imgRatio > boxRatio) {
        w = targetW;
        h = w / imgRatio;
      } else {
        h = targetH;
        w = h * imgRatio;
      }

      const x = (pageW - w) / 2;
      const y = 28; // below header
      doc.addImage(compressed, 'JPEG', x, y, w, h);
    }

    const safeName = Pno.replace(/[\\\/:*?"<>|]/g, '_');
    doc.save(`${safeName}.pdf`);
  });
});
