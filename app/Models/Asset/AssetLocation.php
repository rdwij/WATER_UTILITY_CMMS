<?php

namespace App\Models\Asset;

use Illuminate\Database\Eloquent\Model;
use Kalnoy\Nestedset\NodeTrait;

class AssetLocation extends Model
{
    use NodeTrait;
    

    public function hasLocationUpper($loc_id){
     // dd($this->ancestorsAndSelf($loc_id));//  
	$this->ancestorsAndSelf($loc_id);

    }
}
