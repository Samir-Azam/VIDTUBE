import mongoose, {Schema} from 'mongoose'
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'
const videoSchema = new Schema(
  {
    owner:{
      type:Schema.Types.ObjectId,
      ref:"User"
    },
    videoFile:{
      type:String //cloudinary url
    },
    thumbnail:{
      type:String //cloudinary url
    },
    title:{
      type:String,
      required:true,
    },
    description:{
      type:String,
    },
    duration:{
      type:Number,
    },
    views:{
      type:Number,
      default:0
    },
    isPublished:{
      type:Boolean,
      default:true
    }
  },
  {
    timestamps:true
  }
)

videoSchema.plugin(mongooseAggregatePaginate)
export const Video = mongoose.model("Video",videoSchema)