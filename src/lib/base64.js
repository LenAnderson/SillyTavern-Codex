export const tryDecodeBase64 = (text) => {
    try {
        return atob(text);
    } catch {
        return text;
    }
};
