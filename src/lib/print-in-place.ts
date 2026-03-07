export function printInPlace(url: string) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.src = url;

    document.body.appendChild(iframe);

    iframe.onload = () => {
        const win = iframe.contentWindow;
        if (!win) return;

        let cleaned = false;
        const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            setTimeout(() => iframe.remove(), 300);
        };

        win.onafterprint = cleanup;

        // Give React time to render
        setTimeout(() => {
            win.focus();
            win.print();
            setTimeout(cleanup, 4000);
        }, 500); 
    };
}
