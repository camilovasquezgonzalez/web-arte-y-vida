<?php
/**
 * Plugin Name:       TCultura Connect
 * Plugin URI:        https://tcultura.com
 * Description:       Muestra eventos y actividades culturales desde la plataforma TCultura/DataCultura en tu sitio WordPress.
 * Version:           2.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            Data Cultura
 * Author URI:        https://datacultura.org
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       tcultura-connect
 * Domain Path:       /languages
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/* ─── Plugin Constants ────────────────────────────────────────────────── */

define( 'TCULTURA_VERSION', '2.0.0' );
define( 'TCULTURA_PLUGIN_FILE', __FILE__ );
define( 'TCULTURA_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'TCULTURA_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'TCULTURA_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );

/* ─── Load Configuration ──────────────────────────────────────────────── */

require_once TCULTURA_PLUGIN_DIR . 'includes/config.php';

/* ─── Load Classes ────────────────────────────────────────────────────── */

require_once TCULTURA_PLUGIN_DIR . 'includes/class-api-client.php';
require_once TCULTURA_PLUGIN_DIR . 'admin/class-admin.php';
require_once TCULTURA_PLUGIN_DIR . 'public/class-public.php';

/* ─── Boot Plugin ─────────────────────────────────────────────────────── */

/**
 * Initialize the plugin after all plugins are loaded.
 */
function tcultura_init() {
    $api_client = new TCultura_API_Client();
    new TCultura_Admin( $api_client );
    new TCultura_Public( $api_client );
}
add_action( 'plugins_loaded', 'tcultura_init' );

/* ─── Activation ──────────────────────────────────────────────────────── */

/**
 * Runs on plugin activation. Seeds default options.
 */
function tcultura_activate() {
    $defaults = tcultura_get_default_settings();

    if ( false === get_option( TCULTURA_OPTION_KEY ) ) {
        add_option( TCULTURA_OPTION_KEY, $defaults );
    } else {
        $settings = get_option( TCULTURA_OPTION_KEY, array() );
        $settings = is_array( $settings ) ? $settings : array();

        if ( empty( $settings['api_key'] ) && ! empty( $defaults['api_key'] ) ) {
            $settings['api_key'] = $defaults['api_key'];
            update_option( TCULTURA_OPTION_KEY, $settings );
        }
    }

    flush_rewrite_rules();
}
register_activation_hook( __FILE__, 'tcultura_activate' );

/* ─── Deactivation ────────────────────────────────────────────────────── */

/**
 * Runs on plugin deactivation. Cleans transient cache.
 */
function tcultura_deactivate() {
    delete_transient( TCULTURA_CACHE_KEY );
    flush_rewrite_rules();
}
register_deactivation_hook( __FILE__, 'tcultura_deactivate' );

/* ─── Uninstall ───────────────────────────────────────────────────────── */

/**
 * Note: Full data cleanup happens in uninstall.php (WordPress standard).
 */
