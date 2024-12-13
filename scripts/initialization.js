if (!window.lamejsLoaded) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js';
    script.onload = () => {
        console.log('lame.min.js loaded successfully.');
        window.lamejsLoaded = true;
    };
    script.onerror = () => console.error('Failed to load lame.min.js.');
    document.head.appendChild(script);
}
