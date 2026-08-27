export const ICON_PROPERTIES = Object.freeze([
    'IconName',
    'IconPixmap',
    'AttentionIconName',
    'AttentionIconPixmap',
    'IconThemePath',
]);


export function collectChangedPropertyNames(
    values,
    invalidated = []
) {
    return new Set([
        ...Object.keys(values),
        ...invalidated,
    ]);
}
