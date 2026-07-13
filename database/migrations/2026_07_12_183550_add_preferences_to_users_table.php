<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('currency', 3)->default('USD')->after('avatar');
            $table->boolean('dashboard_notifications')->default(true)->after('currency');
            $table->boolean('email_notifications')->default(true)->after('dashboard_notifications');
            $table->boolean('sms_notifications')->default(false)->after('email_notifications');
            $table->string('phone_number')->nullable()->after('sms_notifications');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'currency',
                'dashboard_notifications',
                'email_notifications',
                'sms_notifications',
                'phone_number',
            ]);
        });
    }
};
