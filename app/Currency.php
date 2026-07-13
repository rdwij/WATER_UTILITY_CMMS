<?php

namespace App;

enum Currency: string
{
    case Usd = 'USD';
    case Eur = 'EUR';
    case Gbp = 'GBP';
    case Lkr = 'LKR';
    case Inr = 'INR';
    case Aud = 'AUD';
    case Cad = 'CAD';

    public function label(): string
    {
        return match ($this) {
            self::Usd => 'US Dollar (USD)',
            self::Eur => 'Euro (EUR)',
            self::Gbp => 'British Pound (GBP)',
            self::Lkr => 'Sri Lankan Rupee (LKR)',
            self::Inr => 'Indian Rupee (INR)',
            self::Aud => 'Australian Dollar (AUD)',
            self::Cad => 'Canadian Dollar (CAD)',
        };
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $currency): array => [
                'value' => $currency->value,
                'label' => $currency->label(),
            ],
            self::cases(),
        );
    }
}
