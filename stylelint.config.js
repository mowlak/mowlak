export default {
	extends: ['stylelint-config-recommended'],
	overrides: [
		{
			// Styles live in <style> blocks inside components, which plain
			// PostCSS cannot parse; postcss-html extracts them.
			files: ['**/*.svelte'],
			customSyntax: 'postcss-html'
		}
	]
};
