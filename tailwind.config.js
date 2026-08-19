/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			/* Sacred Heritage — admin console only. Namespaced under `adm-*`
  			   so these can never collide with the tokens above (or with the
  			   storefront's own design tokens, whenever that system is built
  			   into this config too). Variables are defined in
  			   src/styles/admin-theme.css, scoped to .admin-shell, as RGB
  			   channel triples so opacity modifiers (bg-adm-primary/10) work. */
  			adm: {
  				primary: 'rgb(var(--adm-primary) / <alpha-value>)',
  				'on-primary': 'rgb(var(--adm-on-primary) / <alpha-value>)',
  				'primary-container': 'rgb(var(--adm-primary-container) / <alpha-value>)',
  				'on-primary-container': 'rgb(var(--adm-on-primary-container) / <alpha-value>)',
  				secondary: 'rgb(var(--adm-secondary) / <alpha-value>)',
  				'on-secondary': 'rgb(var(--adm-on-secondary) / <alpha-value>)',
  				'secondary-container': 'rgb(var(--adm-secondary-container) / <alpha-value>)',
  				'on-secondary-container': 'rgb(var(--adm-on-secondary-container) / <alpha-value>)',
  				tertiary: 'rgb(var(--adm-tertiary) / <alpha-value>)',
  				'on-tertiary': 'rgb(var(--adm-on-tertiary) / <alpha-value>)',
  				'tertiary-container': 'rgb(var(--adm-tertiary-container) / <alpha-value>)',
  				'tertiary-fixed': 'rgb(var(--adm-tertiary-fixed) / <alpha-value>)',
  				error: 'rgb(var(--adm-error) / <alpha-value>)',
  				'on-error': 'rgb(var(--adm-on-error) / <alpha-value>)',
  				'error-container': 'rgb(var(--adm-error-container) / <alpha-value>)',
  				'on-error-container': 'rgb(var(--adm-on-error-container) / <alpha-value>)',
  				background: 'rgb(var(--adm-background) / <alpha-value>)',
  				'on-background': 'rgb(var(--adm-on-background) / <alpha-value>)',
  				surface: 'rgb(var(--adm-surface) / <alpha-value>)',
  				'surface-dim': 'rgb(var(--adm-surface-dim) / <alpha-value>)',
  				'surface-bright': 'rgb(var(--adm-surface-bright) / <alpha-value>)',
  				'surface-container-lowest': 'rgb(var(--adm-surface-container-lowest) / <alpha-value>)',
  				'surface-container-low': 'rgb(var(--adm-surface-container-low) / <alpha-value>)',
  				'surface-container': 'rgb(var(--adm-surface-container) / <alpha-value>)',
  				'surface-container-high': 'rgb(var(--adm-surface-container-high) / <alpha-value>)',
  				'surface-container-highest': 'rgb(var(--adm-surface-container-highest) / <alpha-value>)',
  				'surface-variant': 'rgb(var(--adm-surface-variant) / <alpha-value>)',
  				'on-surface': 'rgb(var(--adm-on-surface) / <alpha-value>)',
  				'on-surface-variant': 'rgb(var(--adm-on-surface-variant) / <alpha-value>)',
  				outline: 'rgb(var(--adm-outline) / <alpha-value>)',
  				'outline-variant': 'rgb(var(--adm-outline-variant) / <alpha-value>)',
  				'inverse-surface': 'rgb(var(--adm-inverse-surface) / <alpha-value>)',
  				'inverse-on-surface': 'rgb(var(--adm-inverse-on-surface) / <alpha-value>)'
  			},
  			/* Storefront extended tokens — namespaced `sf-*`, same reasoning
  			   as `adm-*` above. Core brand colors (primary, background) were
  			   applied directly to the shared shadcn tokens instead, since the
  			   storefront is this app's default brand; these are only the
  			   richer surface layers shadcn's base palette doesn't cover.
  			   Variables defined in src/styles/storefront-theme.css, scoped
  			   to .storefront-shell. */
  			sf: {
  				surface: 'rgb(var(--sf-surface) / <alpha-value>)',
  				'surface-dim': 'rgb(var(--sf-surface-dim) / <alpha-value>)',
  				'surface-bright': 'rgb(var(--sf-surface-bright) / <alpha-value>)',
  				'surface-container-lowest': 'rgb(var(--sf-surface-container-lowest) / <alpha-value>)',
  				'surface-container-low': 'rgb(var(--sf-surface-container-low) / <alpha-value>)',
  				'surface-container': 'rgb(var(--sf-surface-container) / <alpha-value>)',
  				'surface-container-high': 'rgb(var(--sf-surface-container-high) / <alpha-value>)',
  				'surface-container-highest': 'rgb(var(--sf-surface-container-highest) / <alpha-value>)',
  				'surface-variant': 'rgb(var(--sf-surface-variant) / <alpha-value>)',
  				'on-surface': 'rgb(var(--sf-on-surface) / <alpha-value>)',
  				'on-surface-variant': 'rgb(var(--sf-on-surface-variant) / <alpha-value>)',
  				outline: 'rgb(var(--sf-outline) / <alpha-value>)',
  				'outline-variant': 'rgb(var(--sf-outline-variant) / <alpha-value>)',
  				'inverse-surface': 'rgb(var(--sf-inverse-surface) / <alpha-value>)',
  				'inverse-on-surface': 'rgb(var(--sf-inverse-on-surface) / <alpha-value>)',
  				primary: 'rgb(var(--sf-primary) / <alpha-value>)',
  				'on-primary': 'rgb(var(--sf-on-primary) / <alpha-value>)',
  				'primary-container': 'rgb(var(--sf-primary-container) / <alpha-value>)',
  				'on-primary-container': 'rgb(var(--sf-on-primary-container) / <alpha-value>)',
  				secondary: 'rgb(var(--sf-secondary) / <alpha-value>)',
  				'on-secondary': 'rgb(var(--sf-on-secondary) / <alpha-value>)',
  				'secondary-container': 'rgb(var(--sf-secondary-container) / <alpha-value>)',
  				'on-secondary-container': 'rgb(var(--sf-on-secondary-container) / <alpha-value>)',
  				gold: 'rgb(var(--sf-gold) / <alpha-value>)',
  				tertiary: 'rgb(var(--sf-tertiary) / <alpha-value>)',
  				'on-tertiary': 'rgb(var(--sf-on-tertiary) / <alpha-value>)',
  				'tertiary-container': 'rgb(var(--sf-tertiary-container) / <alpha-value>)',
  				'on-tertiary-container': 'rgb(var(--sf-on-tertiary-container) / <alpha-value>)',
  				error: 'rgb(var(--sf-error) / <alpha-value>)',
  				'on-error': 'rgb(var(--sf-on-error) / <alpha-value>)',
  				'error-container': 'rgb(var(--sf-error-container) / <alpha-value>)',
  				'on-error-container': 'rgb(var(--sf-on-error-container) / <alpha-value>)',
  				background: 'rgb(var(--sf-background) / <alpha-value>)',
  				'on-background': 'rgb(var(--sf-on-background) / <alpha-value>)'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};