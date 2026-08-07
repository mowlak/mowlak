export default {
	extends: ['stylelint-config-recommended'],
	rules: {
		// :global() is how a Svelte component reaches past its own scope,
		// which the few document-level rules in this app need; postcss-html
		// hands it through as an ordinary pseudo-class.
		'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global'] }]
	},
	overrides: [
		{
			// Styles live in <style> blocks inside components, which plain
			// PostCSS cannot parse; postcss-html extracts them.
			files: ['**/*.svelte'],
			customSyntax: 'postcss-html'
		}
	]
};
