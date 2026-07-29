<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ApprovalStage extends Model
{
    public const STAGE_REQUESTED = 'requested';
    public const STAGE_RECOMMENDED = 'recommended';
    public const STAGE_APPROVED = 'approved';

    public const DECISION_PENDING = 'pending';
    public const DECISION_APPROVED = 'approved';
    public const DECISION_REJECTED = 'rejected';

    protected $fillable = [
        'requestable_type',
        'requestable_id',
        'stage',
        'actor_id',
        'decision',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'decision' => 'string',
            'stage' => 'string',
        ];
    }

    public function requestable(): MorphTo
    {
        return $this->morphTo();
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
