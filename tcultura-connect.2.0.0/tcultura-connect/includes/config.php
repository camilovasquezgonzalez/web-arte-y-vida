<?php
/**
 * Centralized configuration for TCultura Connect.
 *
 * Every magic string, URL, duration, and default lives here.
 * Change a value once and the whole plugin picks it up.
 *
 * @package TCultura_Connect
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/* ─── API ─────────────────────────────────────────────────────────────── */

/** Base URL for the TCultura B2B API (trailing slash required). */
define( 'TCULTURA_API_BASE', 'https://tcultura.com/api/b2b/' );

/** Endpoint that returns paginated eventos.  */
define( 'TCULTURA_EP_EVENTOS', 'eventos/' );

/** Endpoint that returns paginated actividades. */
define( 'TCULTURA_EP_ACTIVIDADES', 'actividades/' );

/** Endpoint that returns project info (used for connection test). */
define( 'TCULTURA_EP_INFO', 'info/' );

/** HTTP header the API expects for authentication. */
define( 'TCULTURA_API_HEADER', 'X-Project-Api-Key' );

/** Environment variable name that can hold the project API key. */
define( 'TCULTURA_API_KEY_ENV_VAR', 'TCULTURA_API_KEY' );

/** Filename used for local, non-versioned API key bootstrap. */
define( 'TCULTURA_API_KEY_FILENAME', 'TCULTURA_API_KEY.txt' );

/** Request timeout in seconds. */
define( 'TCULTURA_API_TIMEOUT', 15 );

/* ─── Cache ───────────────────────────────────────────────────────────── */

/** WordPress transient key for the combined agenda. */
define( 'TCULTURA_CACHE_KEY', 'tcultura_agenda_cache' );

/** Cache TTL in seconds (1 hour). */
define( 'TCULTURA_CACHE_TTL', HOUR_IN_SECONDS );

/* ─── WordPress Options ───────────────────────────────────────────────── */

/** Option key that stores all plugin settings as a single array. */
define( 'TCULTURA_OPTION_KEY', 'tcultura_settings' );

/* ─── Display Defaults ────────────────────────────────────────────────── */

/** Default accent / button colour when no custom colour is set. */
define( 'TCULTURA_DEFAULT_BUTTON_COLOR', '#3b82f6' );

/** Shortcode tag used in pages and posts. */
define( 'TCULTURA_SHORTCODE', 'tcultura_eventos' );

/* ─── Branding / Company Info ─────────────────────────────────────────── */

define( 'TCULTURA_BRAND_NAME', 'TCultura' );
define( 'TCULTURA_BRAND_URL', 'https://tcultura.com' );
define( 'TCULTURA_BRAND_LOGO', TCULTURA_PLUGIN_URL . 'assets/images/logo_tcultura.png' );

define( 'TCULTURA_COMPANY_NAME', 'Data Cultura' );
define( 'TCULTURA_COMPANY_URL', 'https://datacultura.org' );
define( 'TCULTURA_COMPANY_LOGO', TCULTURA_PLUGIN_URL . 'assets/images/datacultura.png' );
define( 'TCULTURA_SUPPORT_EMAIL', 'soporte@tcultura.com' );

/** URL where organisations can register for the platform. */
define( 'TCULTURA_REGISTER_URL', 'https://datacultura.org' );

/**
 * Returns candidate locations for a local API key file.
 *
 * The plugin checks its own folder first, then a few parent directories so
 * local development setups can keep the secret outside the plugin code.
 *
 * @return string[]
 */
function tcultura_get_api_key_file_candidates() {
    $plugin_dir = untrailingslashit( TCULTURA_PLUGIN_DIR );
    $paths      = array(
        $plugin_dir . DIRECTORY_SEPARATOR . TCULTURA_API_KEY_FILENAME,
    );
    $current    = dirname( $plugin_dir );
    $seen_dirs  = array( $plugin_dir );

    for ( $depth = 0; $depth < 3; $depth++ ) {
        if ( ! $current || in_array( $current, $seen_dirs, true ) ) {
            break;
        }

        $paths[] = $current . DIRECTORY_SEPARATOR . TCULTURA_API_KEY_FILENAME;
        $seen_dirs[] = $current;

        $parent = dirname( $current );
        if ( $parent === $current ) {
            break;
        }

        $current = $parent;
    }

    return array_values( array_unique( $paths ) );
}

/**
 * Resolves the API key from an environment variable or local text file.
 *
 * @return array{key: string, type: string, label: string}
 */
function tcultura_resolve_bootstrap_api_key() {
    static $resolved = null;

    if ( null !== $resolved ) {
        return $resolved;
    }

    $resolved = array(
        'key'   => '',
        'type'  => 'none',
        'label' => '',
    );

    $env_key = getenv( TCULTURA_API_KEY_ENV_VAR );
    if ( is_string( $env_key ) ) {
        $env_key = trim( $env_key );

        if ( '' !== $env_key ) {
            $resolved = array(
                'key'   => $env_key,
                'type'  => 'env',
                'label' => TCULTURA_API_KEY_ENV_VAR,
            );

            return $resolved;
        }
    }

    foreach ( tcultura_get_api_key_file_candidates() as $candidate ) {
        if ( ! is_readable( $candidate ) ) {
            continue;
        }

        $contents = file_get_contents( $candidate );
        if ( false === $contents ) {
            continue;
        }

        $file_key = trim( $contents );
        if ( '' === $file_key ) {
            continue;
        }

        $resolved = array(
            'key'   => $file_key,
            'type'  => 'file',
            'label' => $candidate,
        );

        return $resolved;
    }

    return $resolved;
}

/**
 * Returns the externally provided API key, if one is available.
 *
 * @return string
 */
function tcultura_get_bootstrap_api_key() {
    $resolved = tcultura_resolve_bootstrap_api_key();
    return $resolved['key'];
}

/**
 * Returns whether an API key was detected outside the WordPress database.
 *
 * @return bool
 */
function tcultura_has_bootstrap_api_key() {
    return '' !== tcultura_get_bootstrap_api_key();
}

/**
 * Returns the source type for the externally provided API key.
 *
 * @return string
 */
function tcultura_get_bootstrap_api_key_source_type() {
    $resolved = tcultura_resolve_bootstrap_api_key();
    return $resolved['type'];
}

/**
 * Returns the source label for the externally provided API key.
 *
 * @return string
 */
function tcultura_get_bootstrap_api_key_source_label() {
    $resolved = tcultura_resolve_bootstrap_api_key();
    return $resolved['label'];
}

/**
 * Returns the plugin default settings.
 *
 * @return array<string, mixed>
 */
function tcultura_get_default_settings() {
    return array(
        'api_key'         => tcultura_get_bootstrap_api_key(),
        'button_color'    => TCULTURA_DEFAULT_BUTTON_COLOR,
        'date_range'      => 'all',
        'show_events'     => 1,
        'show_activities' => 1,
    );
}

/**
 * Returns plugin settings merged with defaults and external key bootstrap.
 *
 * @return array<string, mixed>
 */
function tcultura_get_settings() {
    $stored = get_option( TCULTURA_OPTION_KEY, array() );
    $stored = is_array( $stored ) ? $stored : array();

    $settings = wp_parse_args( $stored, tcultura_get_default_settings() );

    if ( empty( $stored['api_key'] ) && tcultura_has_bootstrap_api_key() ) {
        $settings['api_key'] = tcultura_get_bootstrap_api_key();
    }

    return $settings;
}

/* ─── Allowed Date Ranges (value ⇒ days) ──────────────────────────────── */

/**
 * Returns the map of selectable date ranges.
 * Using a function so it can be safely called anywhere.
 *
 * @return array<string, array{label: string, days: int}>
 */
function tcultura_get_date_ranges() {
    return array(
        'all'    => array( 'label' => __( 'Todos los eventos', 'tcultura-connect' ), 'days' => 0 ),
        '7days'  => array( 'label' => __( 'Próximos 7 días', 'tcultura-connect' ),   'days' => 7 ),
        '15days' => array( 'label' => __( 'Próximos 15 días', 'tcultura-connect' ),   'days' => 15 ),
        '30days' => array( 'label' => __( 'Próximo mes', 'tcultura-connect' ),         'days' => 30 ),
        '90days' => array( 'label' => __( 'Próximos 3 meses', 'tcultura-connect' ),   'days' => 90 ),
    );
}
