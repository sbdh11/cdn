const { animate, stagger } = window.motion || {};

function showToast(message) {
	const toast = document.querySelector('#toast');
	if (!toast) return;
	toast.textContent = message;
	toast.classList.add('show');
	setTimeout(() => toast.classList.remove('show'), 2200);
}

// Animate cards on load
window.addEventListener('DOMContentLoaded', () => {
	const cards = document.querySelectorAll('.card');
	if (animate && cards.length) {
		animate(cards, { opacity: [0, 1], transform: ["translateY(8px)", "translateY(0)"] }, { delay: stagger(0.08), duration: 0.5 });
	}
});

document.querySelector('#imgget').addEventListener('click', function () {
	const img = document.querySelector('#imggetresult img');
	const urlBox = document.querySelector('#imggetresult .title');
	const input = document.querySelector('#photoid');
	if (!img || !urlBox || !input) return;
	const url = location.protocol + '//' + location.host + '/images/' + input.value;
	img.src = url + '?random=' + Date.now();
	img.style.display = 'block';
	urlBox.innerHTML = url;
	if (animate) animate(img, { opacity: [0, 1], transform: ["scale(.98)", "scale(1)"] }, { duration: 0.35 });
});

document.querySelector('#adddelinput').addEventListener('click', function (e) {
	e.preventDefault();

	const el = e.target.parentElement.querySelector('.delinputs');
	if (!el) return;

	const container = document.createElement('div');
	container.classList.add('delitem');

	const idInput = document.createElement('input');
	idInput.setAttribute('type', 'text');
	idInput.setAttribute('placeholder', 'Image ID');
	idInput.classList.add('del-id-input');

	const pwInput = document.createElement('input');
	pwInput.setAttribute('type', 'text');
	pwInput.setAttribute('placeholder', 'Deletion password');
	pwInput.classList.add('del-pw-input');

	const closeButton = document.createElement('div');
	closeButton.classList.add('close-button');
	closeButton.addEventListener('click', function () {
		container.remove();
	});

	container.appendChild(idInput);
	container.appendChild(pwInput);
	container.appendChild(closeButton);

	el.appendChild(container);
	if (animate) animate(container, { opacity: [0, 1], transform: ["translateY(6px)", "translateY(0)"] }, { duration: 0.3 });
});

document.querySelector('#senddelrequest').addEventListener('click', function (e) {
	const el = e.target.parentElement.querySelector('.delinputs');
	if (!el) return;

	const inputs = el.querySelectorAll('.delitem');

	const request = { files: [] };

	for (const input of inputs) {
		request.files.push({
			id: input.querySelector('.del-id-input').value,
			password: input.querySelector('.del-pw-input').value
		});
	}

	fetch('/images/delete', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(request)
		})
		.then(data => data.json())
		.then(obj => {
			const code = document.querySelector('#imgdeleteresult code');
			if (code) code.innerHTML = JSON.stringify(obj, null, 2);
			showToast('Deletion request processed');
		});
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
			if (code) code.innerHTML = JSON.stringify(obj, null, 2).trim();
			showToast('Upload complete');
		});
});