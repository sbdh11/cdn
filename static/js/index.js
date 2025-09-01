const { animate, stagger } = window.motion || {};

function showToast(message) {
	const toast = document.querySelector('#toast');
	if (!toast) return;
	toast.textContent = message;
	toast.classList.add('show');
	setTimeout(() => toast.classList.remove('show'), 3000);
}

// Initialize Lucide icons
function initIcons() {
	if (window.lucide) {
		lucide.createIcons();
	}
}

// Animate cards on load
window.addEventListener('DOMContentLoaded', () => {
	initIcons();
	
	const cards = document.querySelectorAll('.card');
	if (animate && cards.length) {
		animate(cards, { opacity: [0, 1], transform: ["translateY(8px)", "translateY(0)"] }, { delay: stagger(0.08), duration: 0.5 });
	}
});

document.querySelector('#imgget').addEventListener('click', function () {
	const img = document.querySelector('#imggetresult img');
	const urlBox = document.querySelector('#imggetresult .title');
	const placeholder = document.querySelector('#imggetresult .image-placeholder');
	const input = document.querySelector('#photoid');
	if (!img || !urlBox || !input) return;
	
	const imageId = input.value.trim();
	if (!imageId) {
		showToast('Please enter an image ID');
		return;
	}
	
	const directUrl = location.protocol + '//' + location.host + '/images/' + imageId;
	const embedUrl = location.protocol + '//' + location.host + '/images/' + imageId + '/embed';
	
	img.src = directUrl + '?random=' + Date.now();
	img.style.display = 'block';
	
	// Create URL display with both direct and embed links
	urlBox.innerHTML = `
		<div style="margin-bottom: 10px;">
			<strong>Direct Image:</strong><br>
			<code style="background: hsl(var(--muted)); padding: 4px 8px; border-radius: 4px; font-size: 12px;">${directUrl}</code>
		</div>
		<div>
			<strong>Embed URL (for Discord/Twitter):</strong><br>
			<code style="background: hsl(var(--muted)); padding: 4px 8px; border-radius: 4px; font-size: 12px;">${embedUrl}</code>
		</div>
	`;
	
	if (placeholder) {
		placeholder.style.display = 'none';
	}
	
	if (animate) animate(img, { opacity: [0, 1], transform: ["scale(.98)", "scale(1)"] }, { duration: 0.35 });
});

document.querySelector('#imguploadform').addEventListener('submit', function (e) {
	e.preventDefault();
});

// Drag-and-drop support
(function () {
	const dropzone = document.querySelector('#dropzone');
	const input = document.querySelector('#photos');
	if (!dropzone || !input) return;

	['dragenter', 'dragover'].forEach(evt => {
		dropzone.addEventListener(evt, (e) => {
			e.preventDefault();
			dropzone.classList.add('dragover');
		});
	});
	['dragleave', 'drop'].forEach(evt => {
		dropzone.addEventListener(evt, (e) => {
			e.preventDefault();
			dropzone.classList.remove('dragover');
		});
	});
		dropzone.addEventListener('drop', (e) => {
			if (!e.dataTransfer || !e.dataTransfer.files) return;
			input.files = e.dataTransfer.files;
			const changeEvent = new Event('change');
			input.dispatchEvent(changeEvent);
		});
})();

document.querySelector('#photos').addEventListener('change', function () {
	const form = document.querySelector('#imguploadform');
	if (!form) return;
	const formData = new FormData(form);

	fetch(form.getAttribute('action'), {
			method: 'POST',
			body: formData
		})
		.then(data => data.json())
		.then(obj => {
			const code = document.querySelector('#imguploadresult code');
			if (code) {
				// Format the response to show both direct and embed URLs
				const formattedResponse = {
					...obj,
					files: obj.files.map(file => ({
						...file,
						directUrl: `${location.protocol}//${location.host}/images/${file.id}`,
						embedUrl: `${location.protocol}//${location.host}/images/${file.id}/embed`
					}))
				};
				code.innerHTML = JSON.stringify(formattedResponse, null, 2).trim();
			}
			showToast('Upload complete');
		})
		.catch(err => {
			showToast('Error uploading files');
			console.error(err);
		});
});