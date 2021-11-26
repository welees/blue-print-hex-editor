RegisterStructures(); //To register parser when script was loaded

function RegisterStructures()
{
	var raid1sb=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.1",
		Comment:"RAID 1.x SuperBlock, for ver 0.9/1.0 it shoule be at tail of device, for ver 1.1, it should be at head of device, for ver 1.2, it should be 4K byte from head of device",
		Author:"Ares Lee from welees.com",
		Group:"Disk",
		Type:"raid1sb",
		Name:"RAID 1.x SuperBlock",
		Size:["SectorSize",512], 
		Parameters:{SectorSize:"200",TotalSectors:"800"},
		Members:
		[
			{
				Name:"signature",
				//The member name, the template maybe access member with this name
				Desc:"Signature",
				//Showing name in structure bar
				Type:["uhex","",4],
				Value:function(Parameters,This,Base)
				{
					if(MegaHexCompU(This.Val.signature,"A92B4EFC")==0)
					{
						return ["RAID SuperBlock(A92B4EFCH)",1];
					}
					else
					{
						return ["Unknown("+This.Val.signature+"H)",-1];
					}
				}
			},
			{
				Name:"major",
				Desc:"Major Version",
				Type:["uhex","",4]
			},
			{
				Name:"features",
				Desc:"Features Map",
				Type:["uhex","",4],
				Value:function(Parameters,This,Base)
				{
					var v=parseInt(This.Val.features,16),r='';
					if(v&1)
					{
						r+='Bitmap in used/';
					}
					if(v&2)
					{
						r+='Recoverying/';
					}
					if(v&4)
					{
						r+='Re-shaping/';
					}
					if(r.lrngth>0)
					{
						r=r.substr(0,r.length-1);
					}
					return [r+"("+AbbrValue(This.Val.features)+"H)",0];
				}
			},
			{
				Name:"pad",
				Desc:"Pad",
				Type:["uhex","",4],
			},
			{
				Name:"arrayguid",
				Desc:"GUID of Array",
				Type:["guid","",16],
			},
			{
				Name:"arrayname",
				Desc:"Name of Array",
				Type:["char","",32],
			},
			{
				Name:"createtime",
				Desc:"Create Time",
				Type:["uhex","",8],
			},
			{
				Name:"level",
				Desc:"Level of Array",
				Type:["uhex","",4],
				Value:function(Parameters,This,Base)
				{
					var v=parseInt(This.Val.level,16),r='',know=true;
					debugger;
					switch(v)
					{
						case 4294967292://-4, Multiple path
							r='Multiple Path';
							break;
						case 4294967295://-1
							r='Linear';
							break;
						case 0:
							r="Stripe/RAID0";
							break;
						case 1:
							r="Mirror/RAID1";
							break;
						case 4:
							r="RAID4";
							break;
						case 5:
							r="RAID5";
							break;
						case 6:
							r="RAID6";
							break;
						case 10:
							r="StripeMirror/RAID10";
							break;
						default:
							r="Unknown("+AbbrValue(This.Val.level)+"H)";
							know=false;
							break;
					}
					return [r,know?1:-1];
				}
			},
			{
				Name:"layout",
				Desc:"Layout of RAID",
				Type:["uhex","",4],
				Value:function(Parameters,This,Base)
				{
					var v=parseInt(This.Val.layout,16),r='',know=true;
					switch(v)
					{
						case 0:
							r="Left Asymmetric";
							break;
						case 1:
							r="Right Asymmetric";
							break;
						case 2:
							r="Left Symmetric(Default)";
							break;
						case 3:
							r="Right Symmetric";
							break;
						case 6:
							r="RAID6";
							break;
						case 0x10201:
							r="RAID10 offset2";
							break;
						default:
							r="Unknown("+AbbrValue(This.Val.level)+"H)";
							know=false;
							break;
					}
					return [r,know?1:-1];
				}
			},
			{
				Name:"totalsectors",
				Desc:"Sectors in Array",
				Type:["uhex","",8],
			},
			{
				Name:"chunksectors",
				Desc:"Sectors per Chunk",
				Type:["uhex","",4],
			},
			{
				Name:"deviceinarray",
				Desc:"Devices in Array",
				Type:["uhex","",4],
			},
			{
				Name:"bitmapoffset",
				Desc:"Bitmap Offset",
				Type:["uhex","",4],
			},
			{
				Name:"newlevel",
				Desc:"Level of new RAID",
				Type:["uhex","",4],
				Value:function(Parameters,This,Base)
				{
					var v=parseInt(This.Val.newlevel,16),r='',know=true;
					debugger;
					switch(v)
					{
						case 4294967292://-4, Multiple path
							r='Multiple Path';
							break;
						case 4294967295://-1
							r='Linear';
							break;
						case 0:
							r="Stripe/RAID0";
							break;
						case 1:
							r="Mirror/RAID1";
							break;
						case 4:
							r="RAID4";
							break;
						case 5:
							r="RAID5";
							break;
						case 6:
							r="RAID6";
							break;
						case 10:
							r="StripeMirror/RAID10";
							break;
						default:
							r="Unknown("+AbbrValue(This.Val.level)+"H)";
							know=false;
							break;
					}
					return [r,know?1:-1];
				}
			},
			{
				Name:"reshapeoffset",
				Desc:"Re-shaping Offset",
				Type:["uhex","",8],
			},
			{
				Name:"delta",
				Desc:"Delta Disk for Operation",
				Type:["uhex","",4],
			},
			{
				Name:"newlayout",
				Desc:"Layout of new RAID",
				Type:["uhex","",4],
				Value:function(Parameters,This,Base)
				{
					var v=parseInt(This.Val.newlayout,16),r='',know=true;
					switch(v)
					{
						case 0:
							r="Left Asymmetric";
							break;
						case 1:
							r="Right Asymmetric";
							break;
						case 2:
							r="Left Symmetric(Default)";
							break;
						case 3:
							r="Right Symmetric";
							break;
						case 6:
							r="RAID6";
							break;
						case 0x10201:
							r="RAID10 offset2";
							break;
						default:
							r="Unknown("+AbbrValue(This.Val.level)+"H)";
							know=false;
							break;
					}
					return [r,know?1:-1];
				}
			},
			{
				Name:"newchunksectors",
				Desc:"Sectors per Chunk of new RAID",
				Type:["uhex","",4],
			},
			{
				Name:"pad2",
				Desc:"Pad",
				Type:["uhex","",4],
			},
			{
				Name:"dataoffset",
				Desc:"Data Start Sector",
				Type:["uhex","",8],
			},
			{
				Name:"datasectors",
				Desc:"Data Sectors",
				Type:["uhex","",8],
			},
			{
				Name:"superoffset",
				Desc:"Super Block Start Sector",
				Type:["uhex","",8],
			},
			{
				Name:"recoveryoffset",
				Desc:"Recovered Data Sector",
				Type:["uhex","",8],
			},
			{
				Name:"devnum",
				Desc:"Device Number",
				Type:["uhex","",4],
			},
			{
				Name:"correctedread",
				Desc:"Corrected Read Faults",
				Type:["uhex","",4],
			},
			{
				Name:"devguid",
				Desc:"Device GUID",
				Type:["guid","",16],
			},
			{
				Name:"flags",
				Desc:"Device Flags",
				Type:["uhex","",1],
				Value:function(Parameters,This,Base)
				{
					var v=parseInt(This.Val.newlayout,16),r='',know=true;
					if(v&1)
					{
						r+="Write Mostly";
					}
					return [r+"("+This.Val.flags+"H)",0];
				}
			},
			{
				Name:"pad3",
				Desc:"Pad",
				Type:["uhex","",7],
			},
			{
				Name:"sbupdatetime",
				Desc:"Super Block Update Time",
				Type:["uhex","",8],
			},
			{
				Name:"eventcount",
				Desc:"Event Count of Array",
				Type:["uhex","",8],
			},
			{
				Name:"resyncoffset",
				Desc:"Resync Sector",
				Type:["uhex","",8],
			},
			{
				Name:"checksum",
				Desc:"Check Sum",
				Type:["uhex","",4],
			},
			{
				Name:"maxdev",
				Desc:"Maximum Device Count",
				Type:["uhex","",4],
			},
			{
				Name:"pad4",
				Desc:"Pad",
				Type:["uhex","",32],
			},
		],
	};
	
	if(gStructureParser==undefined)
		setTimeout(RegisterStructures,200);
	else
	{
		gStructureParser.Register(raid1sb);
	}
}

